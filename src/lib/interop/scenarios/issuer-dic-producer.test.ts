import { describe, expect, it } from 'vitest';

import { completeTotals, evaluateCompletion } from '$lib/interop/completion/index.js';
import { checkById, type ScenarioRunRecord } from '$lib/interop/scenario-run/index.js';

import { validateCatalog } from './catalog-validation.js';
import { scenarioFingerprint } from './scenario-fingerprint.js';

import { allScenarios, scenarioBySlug } from './index.js';

/**
 * The six `data-integrity-cryptosuites` producer scenarios (M11 P7) and the two
 * cross-protocol `oneOf` groups they form — the membership model's first real
 * additive scoring.
 */

const EDDSA = ['ob3-direct-issuer-eddsa', 'vcalm-issuer-eddsa', 'oid4-issuer-eddsa'] as const;
const ECDSA = ['ob3-direct-issuer-ecdsa', 'vcalm-issuer-ecdsa', 'oid4-issuer-ecdsa'] as const;
const ALL = [...EDDSA, ...ECDSA];

function fullRun(slug: string): ScenarioRunRecord {
	const scenario = scenarioBySlug(slug)!;
	return {
		scenarioSlug: slug,
		ranAt: '2026-08-21T00:00:00.000Z',
		fingerprint: scenarioFingerprint(scenario),
		status: 'passed',
		attempts: 1,
		outcomes: Object.fromEntries(
			scenario.steps.flatMap((step) =>
				step.requirements.map((r) => [
					r.id,
					{
						requirementId: r.id,
						level: r.level,
						status: 'pass' as const,
						source: 'automated' as const
					}
				])
			)
		)
	};
}

describe('the six DIC producer scenarios', () => {
	it('are all registered single-step issuer scenarios', () => {
		for (const slug of ALL) {
			const scenario = scenarioBySlug(slug);
			expect(scenario, slug).toBeDefined();
			expect(scenario!.role, slug).toBe('issuer');
			expect(scenario!.steps, slug).toHaveLength(1);
		}
	});

	it('are `additive-only` in their base profile and `{oneOf}` in their suite group', () => {
		for (const [slugs, group] of [
			[EDDSA, 'dic-issuer-eddsa'],
			[ECDSA, 'dic-issuer-ecdsa']
		] as const) {
			for (const slug of slugs) {
				const scenario = scenarioBySlug(slug)!;
				const base = scenario.memberships.find((m) => m.profile !== 'data-integrity-cryptosuites')!;
				const dic = scenario.memberships.find((m) => m.profile === 'data-integrity-cryptosuites')!;
				expect(base.level, slug).toBe('additive-only');
				expect(dic.level, slug).toEqual({ oneOf: group });
			}
		}
	});

	it('declare identical requirement ids within each group — catalog rule 5, named per group', () => {
		for (const [slugs, group] of [
			[EDDSA, 'dic-issuer-eddsa'],
			[ECDSA, 'dic-issuer-ecdsa']
		] as const) {
			for (const slug of slugs) {
				expect(
					scenarioBySlug(slug)!.steps[0].requirements.map((r) => r.id),
					`${group} / ${slug}`
				).toEqual(['cryptosuite', 'issuer-did-method']);
			}
		}
	});

	it('use different checks per group, which rule 5 permits — it compares requirement ids', () => {
		const checkOf = (slug: string, id: string) => {
			const requirement = scenarioBySlug(slug)!.steps[0].requirements.find((r) => r.id === id)!;
			return requirement.check.kind === 'automatic' ? requirement.check.checkId : '';
		};
		for (const slug of EDDSA)
			expect(checkOf(slug, 'cryptosuite')).toBe('credential-di-proof-eddsa');
		for (const slug of ECDSA)
			expect(checkOf(slug, 'cryptosuite')).toBe('credential-di-proof-ecdsa');
		for (const slug of ALL) {
			expect(checkOf(slug, 'issuer-did-method')).toBe('credential-issuer-did-method');
			for (const id of ['cryptosuite', 'issuer-did-method']) {
				expect(checkById(checkOf(slug, id)), `${slug}/${id}`).toBeDefined();
			}
		}
	});

	it('reuse their base sibling’s action, and never test the suite’s own key proof', () => {
		for (const slug of ALL) {
			const action = scenarioBySlug(slug)!.steps[0].action!;
			expect(action.kind, slug).toBe('receive-from-issuer');
			if (action.kind === 'receive-from-issuer' && action.transport !== 'direct') {
				// The key proof is the suite's own and is deliberately not the variable
				// under test here — the credential's proof is. The consumer axis is M15.
				expect(action.keyProofSuite, slug).toBe('eddsa-rdfc-2022');
			}
		}
	});

	it('say in the blurb that one protocol is enough, so six scenarios do not read as six obligations', () => {
		for (const slug of ALL) {
			expect(scenarioBySlug(slug)!.blurb, slug).toMatch(/any one protocol/i);
		}
	});

	it('author no DIC consumer requirement — that axis is deferred to M15', () => {
		const ids = ALL.flatMap((slug) =>
			scenarioBySlug(slug)!.steps[0].requirements.map((r) => r.id)
		).join(' ');
		expect(ids).not.toMatch(/consumer|verify-vp|resolve-holder|key-type|proof-purpose/);
	});

	it('keeps the whole catalog valid, including rule 5 on both groups', () => {
		expect(validateCatalog(allScenarios)).toEqual([]);
	});
});

describe('DIC’s issuer meter', () => {
	it('reads two obligations, not six', () => {
		const result = evaluateCompletion({
			profile: 'data-integrity-cryptosuites',
			role: 'issuer',
			runs: {}
		});
		expect(result.obligations).toHaveLength(2);
		expect(
			result.obligations.map((p) =>
				p.obligation.kind === 'oneOf' ? p.obligation.group : p.obligation.scenario.slug
			)
		).toEqual(['dic-issuer-eddsa', 'dic-issuer-ecdsa']);
		// Two requirements each, counted once per group rather than once per member.
		expect(result.total).toBe(4);
	});

	it('marks a group met by whichever single protocol the operator ran', () => {
		for (const slug of EDDSA) {
			const result = evaluateCompletion({
				profile: 'data-integrity-cryptosuites',
				role: 'issuer',
				runs: { [slug]: fullRun(slug) }
			});
			expect(result.obligations, slug).toHaveLength(2);
			expect(result.met, slug).toBe(2);
			expect(result.total, slug).toBe(4);
		}
	});

	it('fills with two runs — one per suite — not six', () => {
		const result = evaluateCompletion({
			profile: 'data-integrity-cryptosuites',
			role: 'issuer',
			runs: {
				'vcalm-issuer-eddsa': fullRun('vcalm-issuer-eddsa'),
				'oid4-issuer-ecdsa': fullRun('oid4-issuer-ecdsa')
			}
		});
		expect(result.met).toBe(result.total);
		expect(result.obligations).toHaveLength(2);
	});

	it('leaves every base profile’s Essential *and* Complete meters unchanged — the silent-regression guard', () => {
		const bases = ['ob3-direct-delivery', 'vcalm', 'oid4'] as const;
		const runs = Object.fromEntries(ALL.map((slug) => [slug, fullRun(slug)]));
		for (const profile of bases) {
			const before = evaluateCompletion({ profile, role: 'issuer', runs: {} });
			const after = evaluateCompletion({ profile, role: 'issuer', runs });
			expect(after.total, profile).toBe(before.total);
			expect(after.met, profile).toBe(before.met);
			// Complete is cumulative (Essential ∪ Expanded), so `optional` here would
			// have put six scenarios of add-on work into every base Complete badge.
			expect(completeTotals(after), profile).toEqual(completeTotals(before));
		}
	});
});

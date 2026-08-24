import { describe, expect, it } from 'vitest';

import { completeTotals, evaluateCompletion } from '$lib/interop/completion/index.js';
import { checkById, type ScenarioRunRecord } from '$lib/interop/scenario-run/index.js';

import { validateCatalog } from './catalog-validation.js';
import { scenarioFingerprint } from './scenario-fingerprint.js';

import { allScenarios, scenarioBySlug } from './index.js';

/**
 * The six `data-integrity-cryptosuites` issuer producer scenarios (M11 P7), and
 * what they became when M15 re-keyed add-on badges to
 * `(additive, base profile, role)`.
 *
 * They used to form two cross-protocol `oneOf` groups, so two runs filled DIC's
 * issuer card. Now each is plain `required` in the additive: six obligations,
 * and each protocol's DIC badge asks for **both** cryptosuites over **that**
 * protocol.
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

	it('are `additive-only` in their base profile and `required` in the additive', () => {
		for (const slug of ALL) {
			const scenario = scenarioBySlug(slug)!;
			const base = scenario.memberships.find((m) => m.profile !== 'data-integrity-cryptosuites')!;
			const dic = scenario.memberships.find((m) => m.profile === 'data-integrity-cryptosuites')!;
			expect(base.level, slug).toBe('additive-only');
			// `required`, not a `oneOf` group: M15 keys the add-on badge per base
			// profile, so a group inside one profile's slice had a single member.
			expect(dic.level, slug).toBe('required');
		}
	});

	it('declare identical requirement ids — by construction now, since rule 5 no longer applies', () => {
		// With the groups gone nothing validates this parity. The shared
		// `producerRequirements` factory IS the guarantee; this notices an inline.
		for (const slug of ALL) {
			expect(
				scenarioBySlug(slug)!.steps[0].requirements.map((r) => r.id),
				slug
			).toEqual(['cryptosuite', 'issuer-did-method']);
		}
	});

	it('use different checks per suite, over the same requirement ids', () => {
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

	it('says in the blurb which protocol’s add-on badge it counts toward', () => {
		// The old copy promised cross-protocol completion ("any one protocol"),
		// which M15 made false. A reader who ran the VCALM member and expected the
		// OID4 card to light up needs to be told otherwise, and the blurb is where
		// they look.
		for (const slug of ALL) {
			expect(scenarioBySlug(slug)!.blurb, slug).toMatch(/this protocol's Data Integrity/i);
			expect(scenarioBySlug(slug)!.blurb, slug).not.toMatch(/any one protocol/i);
		}
	});

	it('author no DIC consumer requirement — that axis lives in `issuer-dic-consumer.ts`', () => {
		const ids = ALL.flatMap((slug) =>
			scenarioBySlug(slug)!.steps[0].requirements.map((r) => r.id)
		).join(' ');
		expect(ids).not.toMatch(/consumer|verify-vp|resolve-holder|key-type|proof-purpose/);
	});

	it('keeps the whole catalog valid', () => {
		expect(validateCatalog(allScenarios)).toEqual([]);
	});
});

describe('DIC’s issuer meter', () => {
	/**
	 * These assert about the **producer** obligations specifically, not the whole
	 * DIC issuer meter — M15 P4 added a consumer axis to the same
	 * `(data-integrity-cryptosuites, issuer)` completion set, and a test that
	 * counted the whole meter would break every time the additive grows.
	 */
	const producerObligations = (runs = {}) =>
		evaluateCompletion({
			profile: 'data-integrity-cryptosuites',
			role: 'issuer',
			runs
		}).obligations.filter(
			(o) => o.obligation.kind === 'scenario' && ALL.includes(o.obligation.scenario.slug as never)
		);

	it('contributes six obligations — one per (protocol × suite)', () => {
		const producer = producerObligations();
		// Before M15: two `oneOf` obligations of 2 each. Now six plain ones, so each
		// protocol's DIC badge asks for both suites over that protocol.
		expect(producer).toHaveLength(6);
		expect(producer.reduce((n, o) => n + o.total, 0)).toBe(12);
	});

	it('credits one (protocol × suite) at a time', () => {
		for (const slug of EDDSA) {
			const producer = producerObligations({ [slug]: fullRun(slug) });
			expect(producer, slug).toHaveLength(6);
			expect(
				producer.reduce((n, o) => n + o.met, 0),
				slug
			).toBe(2);
		}
	});

	it('needs both suites over one protocol to fill that protocol’s share', () => {
		// The pair that earns a DIC VCALM Issuer badge's producer half: EdDSA and
		// ECDSA, both over VCALM. Two runs, four of the producer axis's twelve.
		const producer = producerObligations({
			'vcalm-issuer-eddsa': fullRun('vcalm-issuer-eddsa'),
			'vcalm-issuer-ecdsa': fullRun('vcalm-issuer-ecdsa')
		});
		expect(producer.reduce((n, o) => n + o.met, 0)).toBe(4);
		expect(producer.reduce((n, o) => n + o.total, 0)).toBe(12);
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

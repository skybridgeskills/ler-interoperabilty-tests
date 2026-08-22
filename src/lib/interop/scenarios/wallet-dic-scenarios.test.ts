import { describe, expect, it } from 'vitest';

import { completeTotals, evaluateCompletion } from '$lib/interop/completion/index.js';
import { checkById } from '$lib/interop/scenario-run/index.js';
import { type CannotServe } from '$lib/interop/scenarios/index.js';

import { validateCatalog } from './catalog-validation.js';

import { allScenarios, scenarioBySlug } from './index.js';

/**
 * The eight `data-integrity-cryptosuites` wallet scenarios (M12 P7) and the four
 * `oneOf` groups they form — the catalog's first genuinely **pinned** scenarios,
 * beside four observed ones that mirror them.
 */

const GROUPS = {
	'dic-wallet-present-eddsa': ['oid4-wallet-present-eddsa', 'vcalm-wallet-present-eddsa'],
	'dic-wallet-present-ecdsa': ['oid4-wallet-present-ecdsa', 'vcalm-wallet-present-ecdsa'],
	'dic-wallet-accept-eddsa': ['oid4-wallet-accept-eddsa', 'vcalm-wallet-accept-eddsa'],
	'dic-wallet-accept-ecdsa': ['oid4-wallet-accept-ecdsa', 'vcalm-wallet-accept-ecdsa']
} as const;

const PRESENT = [...GROUPS['dic-wallet-present-eddsa'], ...GROUPS['dic-wallet-present-ecdsa']];
const ACCEPT = [...GROUPS['dic-wallet-accept-eddsa'], ...GROUPS['dic-wallet-accept-ecdsa']];
const ALL = [...PRESENT, ...ACCEPT];

/** Requirement ids of a single-step scenario, in authored order. */
function requirementIds(slug: string): string[] {
	return scenarioBySlug(slug)!.steps[0].requirements.map((r) => r.id);
}

/** The `checkId` behind one requirement, or `''` when it is attested. */
function checkOf(slug: string, id: string): string {
	const requirement = scenarioBySlug(slug)!.steps[0].requirements.find((r) => r.id === id)!;
	return requirement.check.kind === 'automatic' ? requirement.check.checkId : '';
}

/** The pinned intent on a scenario's only step, if it has one. */
function intentOf(slug: string) {
	const { action } = scenarioBySlug(slug)!.steps[0];
	return action && 'intent' in action ? action.intent : undefined;
}

describe('the eight DIC wallet scenarios', () => {
	it('are all registered single-step wallet scenarios', () => {
		for (const slug of ALL) {
			const scenario = scenarioBySlug(slug);
			expect(scenario, slug).toBeDefined();
			expect(scenario!.role, slug).toBe('wallet');
			expect(scenario!.steps, slug).toHaveLength(1);
		}
		for (const slug of PRESENT) {
			expect(scenarioBySlug(slug)!.workflow, slug).toBe('credential-presentation');
		}
		for (const slug of ACCEPT) {
			expect(scenarioBySlug(slug)!.workflow, slug).toBe('credential-acceptance');
		}
	});

	it('are `additive-only` in their base profile and `{oneOf}` in their suite group', () => {
		for (const [group, slugs] of Object.entries(GROUPS)) {
			for (const slug of slugs) {
				const scenario = scenarioBySlug(slug)!;
				const base = scenario.memberships.find((m) => m.profile !== 'data-integrity-cryptosuites')!;
				const dic = scenario.memberships.find((m) => m.profile === 'data-integrity-cryptosuites')!;
				// NOT `optional`: that is the base profile's Expanded tier, and Complete
				// is cumulative, so it would put add-on work into every base badge.
				expect(base.level, slug).toBe('additive-only');
				expect(dic.level, slug).toEqual({ oneOf: group });
			}
		}
	});

	it('declare identical requirement ids within each group — catalog rule 5, asserted directly', () => {
		// Stated here rather than left to `assertValidCatalog` alone, because a
		// reader of this test should see the invariant, not just its enforcement.
		for (const [group, slugs] of Object.entries(GROUPS)) {
			const [first, ...rest] = slugs;
			for (const slug of rest) {
				expect(requirementIds(slug), `${group} / ${slug}`).toEqual(requirementIds(first));
			}
		}

		expect(requirementIds('oid4-wallet-present-eddsa')).toEqual([
			'vp-cryptosuite',
			'holder-did-method',
			'key-type-matches'
		]);
		expect(requirementIds('oid4-wallet-accept-eddsa')).toEqual(['issued-suite', 'verified']);
	});

	it('pins the consumer axis and observes the producer one — the whole point of the pair', () => {
		// The suite mints on the accept axis, so it can choose the cryptosuite.
		expect(intentOf('oid4-wallet-accept-eddsa')).toEqual({
			cryptosuite: 'eddsa-rdfc-2022',
			didMethod: 'key'
		});
		expect(intentOf('vcalm-wallet-accept-ecdsa')).toEqual({
			cryptosuite: 'ecdsa-rdfc-2019',
			didMethod: 'key'
		});
		// The wallet holds the key on the present axis, so nothing can be pinned.
		for (const slug of PRESENT) expect(intentOf(slug), slug).toBeUndefined();
	});

	it('pins exactly the two bundle cryptosuites, and only over `did:key`', () => {
		expect(ACCEPT.map((slug) => intentOf(slug)!.cryptosuite).sort()).toEqual([
			'ecdsa-rdfc-2019',
			'ecdsa-rdfc-2019',
			'eddsa-rdfc-2022',
			'eddsa-rdfc-2022'
		]);
		// `did:web` pinning is deliberately untested — a did:web tenant needs a
		// publicly resolvable URL local dev cannot provide.
		expect(ACCEPT.every((slug) => intentOf(slug)!.didMethod === 'key')).toBe(true);
	});

	it('resolves every checkId in the automatic registry', () => {
		for (const slug of PRESENT) {
			for (const id of ['vp-cryptosuite', 'holder-did-method', 'key-type-matches']) {
				expect(checkById(checkOf(slug, id)), `${slug}/${id}`).toBeDefined();
			}
		}
		for (const slug of ACCEPT) {
			expect(checkById(checkOf(slug, 'issued-suite')), slug).toBeDefined();
			// Only the operator can see the wallet's verdict, so `verified` is attested.
			expect(checkOf(slug, 'verified'), slug).toBe('');
		}
	});

	it('uses the per-suite checks, which rule 5 permits — it compares ids, not checks', () => {
		for (const slug of GROUPS['dic-wallet-present-eddsa']) {
			expect(checkOf(slug, 'vp-cryptosuite')).toBe('wallet-vp-cryptosuite-eddsa');
			expect(checkOf(slug, 'key-type-matches')).toBe('wallet-holder-key-type-eddsa');
		}
		for (const slug of GROUPS['dic-wallet-present-ecdsa']) {
			expect(checkOf(slug, 'vp-cryptosuite')).toBe('wallet-vp-cryptosuite-ecdsa');
			expect(checkOf(slug, 'key-type-matches')).toBe('wallet-holder-key-type-ecdsa');
		}
		// The DID-method question is the same whichever suite the group is about.
		for (const slug of PRESENT) {
			expect(checkOf(slug, 'holder-did-method')).toBe('wallet-holder-did-method');
		}
		// `issued-suite` reuses M11's producer checks unchanged, reading the credential
		// off `StepEvidence.artifact`.
		for (const slug of GROUPS['dic-wallet-accept-eddsa']) {
			expect(checkOf(slug, 'issued-suite')).toBe('credential-di-proof-eddsa');
		}
		for (const slug of GROUPS['dic-wallet-accept-ecdsa']) {
			expect(checkOf(slug, 'issued-suite')).toBe('credential-di-proof-ecdsa');
		}
	});

	it('authors no DIC **issuer** consumer requirement — that axis is M15’s, deliberately', () => {
		const ids = ALL.flatMap(requirementIds).join(' ');
		expect(ids).not.toMatch(/verify-vp|resolve-holder/);
	});

	it('says in the blurb that one protocol is enough, so eight do not read as eight obligations', () => {
		for (const slug of ALL) {
			expect(scenarioBySlug(slug)!.blurb, slug).toMatch(/either protocol/i);
		}
	});

	it('keeps the whole catalog valid, including rule 5 on all four groups', () => {
		expect(validateCatalog(allScenarios)).toEqual([]);
	});
});

describe('DIC’s wallet meter', () => {
	it('reads four obligations, not eight', () => {
		const result = evaluateCompletion({
			profile: 'data-integrity-cryptosuites',
			role: 'wallet',
			runs: {}
		});

		expect(
			result.obligations.map((p) =>
				p.obligation.kind === 'oneOf' ? p.obligation.group : p.obligation.scenario.slug
			)
		).toEqual(Object.keys(GROUPS));
		// 3 + 3 + 2 + 2 requirements, counted once per group rather than per member.
		expect(result.total).toBe(10);
	});

	it('leaves every base profile’s Essential *and* Complete meters unchanged', () => {
		// The silent-regression guard: `additive-only` means the base names these
		// scenarios and claims none of them.
		for (const profile of ['vcalm', 'oid4'] as const) {
			const before = evaluateCompletion({ profile, role: 'wallet', runs: {} });
			expect(before.obligations.map((p) => p.obligation.kind === 'oneOf')).not.toContain(true);
			expect(
				before.obligations.flatMap((p) =>
					p.obligation.kind === 'scenario' ? [p.obligation.scenario.slug] : []
				),
				profile
			).toEqual(expect.not.arrayContaining(ALL));
			expect(completeTotals(before).total, profile).toBeGreaterThan(0);
		}
	});

	it('does NOT shrink the denominator when a pinned scenario is blocked', () => {
		// The invariant the whole pinning design rests on. A deployment with no ECDSA
		// tenant cannot run either member of `dic-wallet-accept-ecdsa`; the obligation
		// stays at its full size and the badge is blocked instead. A shrinking
		// denominator would let two deployments issue badges that look identical and
		// mean different things.
		const reason: CannotServe = {
			kind: 'cryptosuite-unavailable',
			requested: 'ecdsa-rdfc-2019',
			available: ['eddsa-rdfc-2022']
		};
		const blocked = Object.fromEntries(
			GROUPS['dic-wallet-accept-ecdsa'].map((slug) => [slug, reason])
		);

		const open = evaluateCompletion({
			profile: 'data-integrity-cryptosuites',
			role: 'wallet',
			runs: {}
		});
		const gated = evaluateCompletion({
			profile: 'data-integrity-cryptosuites',
			role: 'wallet',
			runs: {},
			blocked
		});

		expect(gated.total).toBe(open.total);
		expect(gated.obligations).toHaveLength(open.obligations.length);

		const ecdsa = gated.obligations.find(
			(p) => p.obligation.kind === 'oneOf' && p.obligation.group === 'dic-wallet-accept-ecdsa'
		)!;
		expect(ecdsa.blocked).toEqual(reason);
		expect(ecdsa.met).toBe(0);
		expect(ecdsa.total).toBe(2);
	});
});

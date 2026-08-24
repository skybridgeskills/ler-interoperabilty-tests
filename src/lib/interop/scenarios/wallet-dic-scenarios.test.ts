import { describe, expect, it } from 'vitest';

import { completeTotals, evaluateCompletion } from '$lib/interop/completion/index.js';
import { checkById, type ScenarioRunRecord } from '$lib/interop/scenario-run/index.js';
import { type CannotServe } from '$lib/interop/scenarios/index.js';

import { validateCatalog } from './catalog-validation.js';
import { scenarioFingerprint } from './scenario-fingerprint.js';

import { allScenarios, scenarioBySlug } from './index.js';

/**
 * The eight `data-integrity-cryptosuites` wallet scenarios (M12 P7) — the
 * catalog's first genuinely **pinned** scenarios, beside four observed ones that
 * mirror them.
 *
 * M12 shipped them in four cross-protocol `oneOf` groups. M15 re-keyed the add-on
 * badge to `(additive, base profile, role)` and dropped the groups, so each is
 * plain `required` in the additive: *DIC VCALM Wallet* asks for all four VCALM
 * scenarios, *DIC OID4 Wallet* for all four OID4 ones.
 *
 * The **pairs** below are no longer obligations — they are the two protocols
 * asking the same question, and several tests still assert their parity because
 * a reader comparing an OID4 result with a VCALM one must be comparing like with
 * like. Nothing validates that parity any more; these tests are the guarantee.
 */

const PAIRS = {
	'present-eddsa': ['oid4-wallet-present-eddsa', 'vcalm-wallet-present-eddsa'],
	'present-ecdsa': ['oid4-wallet-present-ecdsa', 'vcalm-wallet-present-ecdsa'],
	'accept-eddsa': ['oid4-wallet-accept-eddsa', 'vcalm-wallet-accept-eddsa'],
	'accept-ecdsa': ['oid4-wallet-accept-ecdsa', 'vcalm-wallet-accept-ecdsa']
} as const;

const PRESENT = [...PAIRS['present-eddsa'], ...PAIRS['present-ecdsa']];
const ACCEPT = [...PAIRS['accept-eddsa'], ...PAIRS['accept-ecdsa']];
const ALL = [...PRESENT, ...ACCEPT];

/** A record marking every requirement of a scenario passed. */
function fullRun(slug: string): ScenarioRunRecord {
	const scenario = scenarioBySlug(slug)!;
	return {
		scenarioSlug: slug,
		ranAt: '2026-08-22T00:00:00.000Z',
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

	it('are `additive-only` in their base profile and `required` in the additive', () => {
		for (const slug of ALL) {
			const scenario = scenarioBySlug(slug)!;
			const base = scenario.memberships.find((m) => m.profile !== 'data-integrity-cryptosuites')!;
			const dic = scenario.memberships.find((m) => m.profile === 'data-integrity-cryptosuites')!;
			// NOT `optional`: that is the base profile's Expanded tier, and Complete
			// is cumulative, so it would put add-on work into every base badge.
			expect(base.level, slug).toBe('additive-only');
			// `required`, not a `oneOf` group — M15 keys add-on badges per base profile.
			expect(dic.level, slug).toBe('required');
		}
	});

	it('declare identical requirement ids across each protocol pair — nothing validates this now', () => {
		// Until M15 catalog rule 5 enforced it, because each pair was a `oneOf`
		// group. The group is gone, so this test IS the guarantee that the two
		// protocols keep asking the same question.
		for (const [pair, slugs] of Object.entries(PAIRS)) {
			const [first, ...rest] = slugs;
			for (const slug of rest) {
				expect(requirementIds(slug), `${pair} / ${slug}`).toEqual(requirementIds(first));
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
		for (const slug of PAIRS['present-eddsa']) {
			expect(checkOf(slug, 'vp-cryptosuite')).toBe('wallet-vp-cryptosuite-eddsa');
			expect(checkOf(slug, 'key-type-matches')).toBe('wallet-holder-key-type-eddsa');
		}
		for (const slug of PAIRS['present-ecdsa']) {
			expect(checkOf(slug, 'vp-cryptosuite')).toBe('wallet-vp-cryptosuite-ecdsa');
			expect(checkOf(slug, 'key-type-matches')).toBe('wallet-holder-key-type-ecdsa');
		}
		// The DID-method question is the same whichever suite the group is about.
		for (const slug of PRESENT) {
			expect(checkOf(slug, 'holder-did-method')).toBe('wallet-holder-did-method');
		}
		// `issued-suite` reuses M11's producer checks unchanged, reading the credential
		// off `StepEvidence.artifact`.
		for (const slug of PAIRS['accept-eddsa']) {
			expect(checkOf(slug, 'issued-suite')).toBe('credential-di-proof-eddsa');
		}
		for (const slug of PAIRS['accept-ecdsa']) {
			expect(checkOf(slug, 'issued-suite')).toBe('credential-di-proof-ecdsa');
		}
	});

	it('authors no DIC **issuer** consumer requirement — that axis is the issuer family’s', () => {
		const ids = ALL.flatMap(requirementIds).join(' ');
		expect(ids).not.toMatch(/verify-vp|resolve-holder/);
	});

	it('says in the blurb which protocol’s add-on badge it counts toward', () => {
		// The M12 copy promised cross-protocol completion, which M15 made false.
		for (const slug of ALL) {
			expect(scenarioBySlug(slug)!.blurb, slug).toMatch(/this protocol's Data Integrity/i);
			expect(scenarioBySlug(slug)!.blurb, slug).not.toMatch(/either protocol/i);
		}
	});

	it('keeps the whole catalog valid', () => {
		expect(validateCatalog(allScenarios)).toEqual([]);
	});
});

describe('DIC’s wallet meter', () => {
	it('reads eight obligations — one per (protocol × suite × axis)', () => {
		const result = evaluateCompletion({
			profile: 'data-integrity-cryptosuites',
			role: 'wallet',
			runs: {}
		});

		// Before M15: four `oneOf` obligations totalling 10. Now eight plain ones
		// totalling 20 — each protocol's DIC badge asks for its own four.
		expect(result.obligations).toHaveLength(8);
		expect(result.obligations.map((o) => o.obligation.kind)).not.toContain('oneOf');
		expect(result.total).toBe(20);
	});

	it('credits one protocol at a time — running VCALM does not fill the OID4 share', () => {
		const result = evaluateCompletion({
			profile: 'data-integrity-cryptosuites',
			role: 'wallet',
			runs: Object.fromEntries(
				['vcalm-wallet-present-eddsa', 'vcalm-wallet-present-ecdsa'].map((slug) => [
					slug,
					fullRun(slug)
				])
			)
		});

		// Six of twenty: the two VCALM present scenarios, three requirements each.
		// Their OID4 siblings are untouched, which is the whole change.
		expect(result.met).toBe(6);
		expect(result.total).toBe(20);
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
		// The invariant the whole pinning design rests on, and it is unaffected by
		// dropping the groups. A deployment with no ECDSA tenant cannot run the two
		// ECDSA accept scenarios; their requirements stay in `total` and the badge
		// is blocked instead. A shrinking denominator would let two deployments
		// issue badges that look identical and mean different things.
		const reason: CannotServe = {
			kind: 'cryptosuite-unavailable',
			requested: 'ecdsa-rdfc-2019',
			available: ['eddsa-rdfc-2022']
		};
		const blocked = Object.fromEntries(PAIRS['accept-ecdsa'].map((slug) => [slug, reason]));

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

		// Both members are now separately blocked, one per protocol, rather than one
		// group carrying the reason for both.
		for (const slug of PAIRS['accept-ecdsa']) {
			const progress = gated.obligations.find(
				(p) => p.obligation.kind === 'scenario' && p.obligation.scenario.slug === slug
			)!;
			expect(progress.blocked, slug).toEqual(reason);
			expect(progress.met, slug).toBe(0);
			expect(progress.total, slug).toBe(2);
		}
	});
});

import { afterEach, describe, expect, it, vi } from 'vitest';

// The badge set is derived from the live catalog via `scenariosFor`. Stand a
// small, mutable one in place of the real registry so we can prove the badge
// fingerprint tracks scoring content and ignores copy.
const catalog = vi.hoisted(() => {
	const scenario = (slug: string, over: Record<string, unknown> = {}) => ({
		slug,
		name: 'Accept a well-formed credential',
		blurb: 'The happy path.',
		role: 'wallet' as const,
		workflow: 'credential-acceptance' as const,
		memberships: [{ profile: 'oid4' as const, level: 'required' as const }],
		steps: [
			{
				id: 'offer',
				title: 'Offer the credential',
				summary: 'We will issue your wallet a credential.',
				action: { kind: 'issue' as const, credential: 'minimal-ob3' },
				requirements: [
					{
						id: 'stored',
						statement: 'The credential appears in your wallet’s list.',
						level: 'MUST' as const,
						check: { kind: 'attested' as const, answer: { kind: 'affirm' as const } }
					}
				]
			}
		],
		...over
	});
	// A second scenario with a distinct requirement id, so requirement-id order matters.
	const second = scenario('oid4-wallet-refusal-discrimination', {
		steps: [
			{
				id: 'offer',
				title: 'Offer an expired credential',
				summary: 'We will offer your wallet an expired credential.',
				action: { kind: 'issue' as const, credential: 'ob3-expired' },
				requirements: [
					{
						id: 'aaa-refused',
						statement: 'The wallet refused the credential.',
						level: 'MUST' as const,
						check: { kind: 'attested' as const, answer: { kind: 'affirm' as const } }
					}
				]
			}
		]
	});
	return { list: [scenario('oid4-wallet-acceptance'), second] as Record<string, unknown>[] };
});

vi.mock('$lib/interop/scenarios/all-scenarios.js', () => ({
	get allScenarios() {
		return catalog.list;
	}
}));

const { djb2Hex, scenarioFingerprint } =
	await import('$lib/interop/scenarios/scenario-fingerprint.js');
const { scenariosFor } = await import('$lib/interop/scenarios/accessors.js');
const {
	allBadgeSlugs,
	awardNarrative,
	BadgeDefinition,
	badgeBySlug,
	badgeFingerprint,
	essentialBadgeFor,
	claimSnapshot,
	expandedBadgeFor,
	criteriaNarrative,
	newSince,
	requirementIdsBehindBadge,
	scenariosBehindBadge
} = await import('./index.js');

/**
 * A minimal catalog scenario for the tier tests — `membershipsOfProfile` /
 * `scenariosBehindBadge` read only `role`, `memberships`, and requirement ids.
 */
function mkScenario(
	slug: string,
	profile: string,
	level: unknown,
	reqId: string
): Record<string, unknown> {
	return {
		slug,
		name: 'x',
		blurb: 'x',
		role: 'wallet',
		workflow: 'credential-acceptance',
		memberships: [{ profile, level }],
		steps: [
			{
				id: 'offer',
				title: 'x',
				summary: 'x',
				action: { kind: 'issue', credential: 'minimal-ob3' },
				requirements: [
					{
						id: reqId,
						statement: 'x',
						level: 'MUST',
						check: { kind: 'attested', answer: { kind: 'affirm' } }
					}
				]
			}
		]
	};
}

const baseList = catalog.list;
afterEach(() => {
	catalog.list = baseList;
});

const badge = () => badgeBySlug('oid4-wallet-essential')!;

describe('badge registry', () => {
	it('resolves oid4-wallet from its completion key', () => {
		expect(essentialBadgeFor('oid4', 'wallet')?.slug).toBe('oid4-wallet-essential');
	});

	it('has no badge for a key with no registered badge', () => {
		// M15 P7 filled the registry, so every (base profile, role) with scenarios
		// now HAS an Essential badge. What still has none is a pair with no
		// scenarios at all, and an additive slug — which since M15 has no single
		// badge spanning its base profiles, only one per base profile.
		expect(essentialBadgeFor('ob3-direct-delivery', 'wallet')).toBeUndefined();
		expect(essentialBadgeFor('data-integrity-cryptosuites', 'wallet')).toBeUndefined();
	});

	it('looks a badge up by slug, and returns undefined for an unknown one', () => {
		expect(badgeBySlug('oid4-wallet-essential')?.name).toBe('OID4 Wallet — Essential');
		expect(badgeBySlug('oid4-wallet-expanded')?.name).toBe('OID4 Wallet — Expanded');
		expect(badgeBySlug('no-such-badge')).toBeUndefined();
	});

	it('registers both tiers of the oid4/wallet bundle', () => {
		// Both tiers of the oid4/wallet bundle are registered, among the rest.
		expect(allBadgeSlugs()).toContain('oid4-wallet-essential');
		expect(allBadgeSlugs()).toContain('oid4-wallet-expanded');
	});
});

describe('scenariosBehindBadge', () => {
	it('is the catalog set for the badge key', () => {
		expect(scenariosBehindBadge(badge()).map((s) => s.slug)).toEqual(
			scenariosFor('oid4', 'wallet').map((s) => s.slug)
		);
	});
});

describe('badge tiers', () => {
	// The remodel (M14, re-keyed in M15): a badge scores the sub-set its tier names
	// — `essential` the required floor, `expanded` that floor plus the same base
	// profile's optional set, `add-on` one additive's work within ONE base profile.
	const complete = () =>
		BadgeDefinition({
			slug: 'oid4-wallet-expanded',
			tier: 'expanded',
			baseProfile: 'oid4',
			role: 'wallet',
			name: 'OID4 Wallet — Expanded',
			description: 'x',
			criteriaSummary: 'x'
		});

	it('base scores the required (+oneOf) floor, never the optional set', () => {
		catalog.list = [
			...baseList,
			mkScenario('oid4-wallet-faithful-rendering', 'oid4', 'optional', 'zzz-rendered')
		];
		expect(scenariosBehindBadge(badge()).map((s) => s.slug)).toEqual([
			'oid4-wallet-acceptance',
			'oid4-wallet-refusal-discrimination'
		]);
	});

	it('complete is cumulative — the floor plus the same base profile’s optional set', () => {
		// Complete means "everything this profile asks of this role", so its set
		// NESTS inside the base badge's rather than partitioning against it.
		catalog.list = [
			...baseList,
			mkScenario('oid4-wallet-faithful-rendering', 'oid4', 'optional', 'zzz-rendered')
		];
		expect(scenariosBehindBadge(complete()).map((s) => s.slug)).toEqual([
			'oid4-wallet-acceptance',
			'oid4-wallet-refusal-discrimination',
			'oid4-wallet-faithful-rendering'
		]);
		// Sorted, so member order cannot perturb a snapshot's requirementIds.
		expect(requirementIdsBehindBadge(complete())).toEqual([
			'aaa-refused',
			'stored',
			'zzz-rendered'
		]);
	});

	it('neither base nor complete scores an additive-only scenario', () => {
		// The base profile hosts it and claims none of it; it belongs to whichever
		// additive requires it, and must not inflate a Complete denominator.
		catalog.list = [
			...baseList,
			{
				...mkScenario('oid4-wallet-ecdsa', 'oid4', 'additive-only', 'ddd-ecdsa'),
				memberships: [
					{ profile: 'oid4', level: 'additive-only' },
					{ profile: 'data-integrity-cryptosuites', level: 'required' }
				]
			}
		];
		expect(scenariosBehindBadge(badge()).map((s) => s.slug)).not.toContain('oid4-wallet-ecdsa');
		expect(scenariosBehindBadge(complete()).map((s) => s.slug)).not.toContain('oid4-wallet-ecdsa');
	});

	it('essential and expanded key to the same base profile-role', () => {
		// The registry holds both tiers; `essentialBadgeFor` returns the floor badge,
		// never the expanded one, and `expandedBadgeFor` returns the cumulative tier.
		expect(essentialBadgeFor('oid4', 'wallet')?.slug).toBe('oid4-wallet-essential');
		expect(expandedBadgeFor('oid4', 'wallet')?.slug).toBe('oid4-wallet-expanded');
	});

	/**
	 * A realistically-shaped additive scenario: `additive-only` in its base
	 * profile, claimed by the additive. `mkScenario` alone names no base profile at
	 * all, which violates catalog rule 4 and — since M15 — makes an add-on badge
	 * unable to place the scenario under any protocol.
	 */
	const addOnScenario = (slug: string, base: string, level: string, reqId: string) => ({
		...mkScenario(slug, 'data-integrity-cryptosuites', level, reqId),
		memberships: [
			{ profile: base, level: 'additive-only' },
			{ profile: 'data-integrity-cryptosuites', level }
		]
	});

	it('add-on scores the whole additive set, single tier, within ONE base profile', () => {
		catalog.list = [
			...baseList,
			addOnScenario('oid4-wallet-di', 'oid4', 'required', 'di-1'),
			addOnScenario('oid4-wallet-di-opt', 'oid4', 'optional', 'di-2')
		];
		const addOn = BadgeDefinition({
			slug: 'dic-oid4-wallet',
			tier: 'add-on',
			additiveProfile: 'data-integrity-cryptosuites',
			baseProfile: 'oid4',
			role: 'wallet',
			name: 'x',
			description: 'x',
			criteriaSummary: 'x'
		});
		expect(scenariosBehindBadge(addOn).map((s) => s.slug)).toEqual([
			'oid4-wallet-di',
			'oid4-wallet-di-opt'
		]);
	});

	it('an add-on badge EXCLUDES the same additive’s work under another base profile', () => {
		// The whole of M15's re-keying, asserted directly. Before it, one badge
		// spanned every base profile and this exclusion did not exist.
		catalog.list = [
			...baseList,
			addOnScenario('oid4-wallet-di', 'oid4', 'required', 'di-1'),
			addOnScenario('vcalm-wallet-di', 'vcalm', 'required', 'di-2')
		];
		const forOid4 = (baseProfile: 'oid4' | 'vcalm') =>
			BadgeDefinition({
				slug: `dic-${baseProfile}-wallet`,
				tier: 'add-on',
				additiveProfile: 'data-integrity-cryptosuites',
				baseProfile,
				role: 'wallet',
				name: 'x',
				description: 'x',
				criteriaSummary: 'x'
			});

		expect(scenariosBehindBadge(forOid4('oid4')).map((s) => s.slug)).toEqual(['oid4-wallet-di']);
		expect(scenariosBehindBadge(forOid4('vcalm')).map((s) => s.slug)).toEqual(['vcalm-wallet-di']);
	});
});

describe('badgeFingerprint', () => {
	it('is deterministic across calls', () => {
		expect(badgeFingerprint(badge())).toBe(badgeFingerprint(badge()));
	});

	it('composes the per-scenario fingerprints through the same djb2 hash — no reimplementation', () => {
		const expected = djb2Hex(
			scenariosFor('oid4', 'wallet').map(scenarioFingerprint).sort().join('|')
		);
		expect(badgeFingerprint(badge())).toBe(expected);
	});

	it('does not depend on the catalog order of its members', () => {
		const forwards = badgeFingerprint(badge());
		catalog.list = [...baseList].reverse();
		expect(badgeFingerprint(badge())).toBe(forwards);
	});

	it('changes when a member’s scoring content changes', () => {
		const before = badgeFingerprint(badge());
		const changed = structuredClone(baseList);
		(changed[0].steps as { requirements: { statement: string }[] }[])[0].requirements[0].statement =
			'The credential was stored (reworded requirement — a scoring change).';
		catalog.list = changed;
		expect(badgeFingerprint(badge())).not.toBe(before);
	});

	it('does not change when only cosmetic copy changes', () => {
		const before = badgeFingerprint(badge());
		const cosmetic = structuredClone(baseList);
		cosmetic[0].name = 'A completely different display name';
		cosmetic[0].blurb = 'Reworded blurb.';
		catalog.list = cosmetic;
		expect(badgeFingerprint(badge())).toBe(before);
	});
});

describe('requirementIdsBehindBadge', () => {
	it('returns every requirement id in the set, sorted', () => {
		expect(requirementIdsBehindBadge(badge())).toEqual(['aaa-refused', 'stored']);
	});
});

describe('narrative', () => {
	it('criteriaNarrative is the badge’s criteria summary', () => {
		expect(criteriaNarrative(badge())).toBe(badge().criteriaSummary);
	});

	it('awardNarrative names the set and counts, and enumerates no scenario', () => {
		const text = awardNarrative({
			badge: badge(),
			requirementsMet: 2,
			requirementsTotal: 2,
			scenarioCount: 2,
			claimedAt: '2026-08-03T09:00:00.000Z'
		});
		expect(text).toContain('OID4 Wallet');
		expect(text).toContain('2 of 2 requirements');
		expect(text).toContain('across 2 scenarios');
		expect(text).toContain('3 Aug 2026');
		for (const scenario of scenariosBehindBadge(badge())) {
			expect(text).not.toContain(scenario.slug);
		}
	});
});

describe('claimSnapshot', () => {
	it('carries a sorted requirement-id set and the badge fingerprint at claim time', () => {
		const snapshot = claimSnapshot(badge(), '2026-08-03T09:00:00.000Z');
		expect(snapshot.badgeSlug).toBe('oid4-wallet-essential');
		expect(snapshot.claimedAt).toBe('2026-08-03T09:00:00.000Z');
		expect(snapshot.requirementIds).toEqual(['aaa-refused', 'stored']);
		expect(snapshot.fingerprint).toBe(badgeFingerprint(badge()));
	});
});

describe('newSince', () => {
	it('counts only requirement ids absent from the snapshot', () => {
		const snapshot = claimSnapshot(badge(), '2026-08-03T09:00:00.000Z');
		const result = newSince(snapshot, ['stored', 'aaa-refused', 'freshly-added', 'another-new']);
		expect(result.count).toBe(2);
		expect(result.ids).toEqual(['freshly-added', 'another-new']);
	});

	it('is a membership diff — an unchanged set is empty even if fingerprints differ', () => {
		const snapshot = claimSnapshot(badge(), '2026-08-03T09:00:00.000Z');
		expect(newSince(snapshot, ['aaa-refused', 'stored']).count).toBe(0);
	});
});

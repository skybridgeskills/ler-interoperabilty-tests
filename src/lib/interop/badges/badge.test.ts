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
	badgeBySlug,
	badgeFingerprint,
	badgeFor,
	claimSnapshot,
	criteriaNarrative,
	newSince,
	requirementIdsBehindBadge,
	scenariosBehindBadge
} = await import('./index.js');

const baseList = catalog.list;
afterEach(() => {
	catalog.list = baseList;
});

const badge = () => badgeBySlug('oid4-wallet')!;

describe('badge registry', () => {
	it('resolves oid4-wallet from its completion key', () => {
		expect(badgeFor('oid4', 'wallet')?.slug).toBe('oid4-wallet');
	});

	it('has no badge for a key with no registered badge', () => {
		expect(badgeFor('oid4', 'issuer')).toBeUndefined();
		expect(badgeFor('vcalm', 'wallet')).toBeUndefined();
	});

	it('looks a badge up by slug, and returns undefined for an unknown one', () => {
		expect(badgeBySlug('oid4-wallet')?.name).toBe('OID4 Wallet');
		expect(badgeBySlug('oid4-wallet-complete')).toBeUndefined();
	});

	it('registers only the base badge — the second tier is intentionally absent', () => {
		expect(allBadgeSlugs()).toEqual(['oid4-wallet']);
	});
});

describe('scenariosBehindBadge', () => {
	it('is the catalog set for the badge key', () => {
		expect(scenariosBehindBadge(badge()).map((s) => s.slug)).toEqual(
			scenariosFor('oid4', 'wallet').map((s) => s.slug)
		);
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
		expect(snapshot.badgeSlug).toBe('oid4-wallet');
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

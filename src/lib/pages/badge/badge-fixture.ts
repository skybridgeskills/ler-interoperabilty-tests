import {
	BadgeClaimSnapshot,
	badgeBySlug,
	criteriaNarrative,
	requirementIdsBehindBadge
} from '$lib/interop/badges/index.js';
import type { CompletionResult } from '$lib/interop/completion/index.js';

/** The registered base badge, and its live requirement set. */
export const demoBadge = badgeBySlug('oid4-wallet')!;
const requirementIds = requirementIdsBehindBadge(demoBadge);
const total = requirementIds.length;

/** The server-computed props every story shares. */
export const serverProps = {
	badge: demoBadge,
	criteriaNarrative: criteriaNarrative(demoBadge),
	achievementId: 'https://tests.example/badges/oid4-wallet',
	criteriaId: 'https://tests.example/badges/oid4-wallet?v=abcd1234'
};

/** No progress — a stranger's meter. */
export const emptyResult: CompletionResult = {
	met: 0,
	total,
	obligations: [],
	optional: { met: 0, total: 0, obligations: [] }
};

/** A full required set — claimable. */
export const fullResult: CompletionResult = {
	met: total,
	total,
	obligations: [],
	optional: { met: 0, total: 0, obligations: [] }
};

/** A prior claim covering the whole current set — nothing new since. */
export const claimedSnapshot = BadgeClaimSnapshot({
	badgeSlug: demoBadge.slug,
	claimedAt: '2026-08-03T09:00:00.000Z',
	fingerprint: 'abcd1234',
	requirementIds
});

/** A prior claim from before one requirement was added — one "new since". */
export const staleSnapshot = BadgeClaimSnapshot({
	badgeSlug: demoBadge.slug,
	claimedAt: '2026-07-01T09:00:00.000Z',
	fingerprint: 'old00000',
	requirementIds: requirementIds.slice(1)
});

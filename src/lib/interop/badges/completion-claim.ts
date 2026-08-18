import { requirementIdsBehindBadge } from './accessors.js';
import { badgeFor } from './badge-registry.js';
import type { BadgeClaimSnapshot } from './claim-snapshot.js';
import { newSince } from './new-since.js';

/** The claimed-badge summary a completion group renders beside its meter. */
export type ClaimedInfo = {
	claimedAt: string;
	requirementCount: number;
	/** Requirements added to the set since the claim — the honest "k new since". */
	newSince: number;
};

/** The `/badges/[slug]` route for a completion key, or `undefined` when no badge is registered. */
export function badgeHrefFor(profileSlug: string, roleSlug: string): string | undefined {
	const badge = badgeFor(profileSlug, roleSlug);
	return badge ? `/badges/${badge.slug}` : undefined;
}

/**
 * The claimed-state summary for a completion group, computed from the claim
 * snapshots. `undefined` when no badge is registered or none has been claimed —
 * so the group shows its claim affordance rather than a claimed line. Reuses
 * {@link newSince}; never recomputes a diff.
 */
export function claimedInfoFor(
	profileSlug: string,
	roleSlug: string,
	claims: BadgeClaimSnapshot[]
): ClaimedInfo | undefined {
	const badge = badgeFor(profileSlug, roleSlug);
	if (!badge) return undefined;
	const snapshot = claims
		.filter((c) => c.badgeSlug === badge.slug)
		.sort((a, b) => (a.claimedAt < b.claimedAt ? 1 : -1))[0];
	if (!snapshot) return undefined;
	return {
		claimedAt: snapshot.claimedAt,
		requirementCount: snapshot.requirementIds.length,
		newSince: newSince(snapshot, requirementIdsBehindBadge(badge)).count
	};
}

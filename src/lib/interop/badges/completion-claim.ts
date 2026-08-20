import { requirementIdsBehindBadge } from './accessors.js';
import { badgeFor, completeBadgeFor } from './badge-registry.js';
import type { BadgeDefinition } from './badge-schema.js';
import type { BadgeClaimSnapshot } from './claim-snapshot.js';
import { newSince } from './new-since.js';

/** The claimed-badge summary a completion group renders beside its meter. */
export type ClaimedInfo = {
	claimedAt: string;
	requirementCount: number;
	/** Requirements added to the set since the claim — the honest "k new since". */
	newSince: number;
};

/** The `/badges/[slug]` route for a badge, or `undefined` when none is registered. */
function hrefFor(badge: BadgeDefinition | undefined): string | undefined {
	return badge ? `/badges/${badge.slug}` : undefined;
}

/**
 * The claimed-state summary for a badge, from the claim snapshots. `undefined`
 * when the badge is unregistered or unclaimed — so the group shows its claim
 * affordance rather than a claimed line. Reuses {@link newSince}; never recomputes
 * a diff.
 */
function claimedInfo(
	badge: BadgeDefinition | undefined,
	claims: BadgeClaimSnapshot[]
): ClaimedInfo | undefined {
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

// --- Core / single-tier (base or additive) badge ----------------------------

/** The `/badges/[slug]` route for a group's primary (Core / single-tier) badge. */
export function badgeHrefFor(profileSlug: string, roleSlug: string): string | undefined {
	return hrefFor(badgeFor(profileSlug, roleSlug));
}

/** The claimed-state summary for a group's primary badge. */
export function claimedInfoFor(
	profileSlug: string,
	roleSlug: string,
	claims: BadgeClaimSnapshot[]
): ClaimedInfo | undefined {
	return claimedInfo(badgeFor(profileSlug, roleSlug), claims);
}

/** The display name of a group's primary badge, e.g. "OID4 Wallet". */
export function badgeNameFor(profileSlug: string, roleSlug: string): string | undefined {
	return badgeFor(profileSlug, roleSlug)?.name;
}

// --- Complete (expanded) tier badge -----------------------------------------

/** The `/badges/[slug]` route for a base profile-role's Complete badge, if registered. */
export function completeBadgeHrefFor(profileSlug: string, roleSlug: string): string | undefined {
	return hrefFor(completeBadgeFor(profileSlug, roleSlug));
}

/** The claimed-state summary for a base profile-role's Complete badge. */
export function completeClaimedInfoFor(
	profileSlug: string,
	roleSlug: string,
	claims: BadgeClaimSnapshot[]
): ClaimedInfo | undefined {
	return claimedInfo(completeBadgeFor(profileSlug, roleSlug), claims);
}

/** The display name of a base profile-role's Complete badge, e.g. "OID4 Wallet — Complete". */
export function completeBadgeNameFor(profileSlug: string, roleSlug: string): string | undefined {
	return completeBadgeFor(profileSlug, roleSlug)?.name;
}

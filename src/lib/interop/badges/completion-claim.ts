import { requirementIdsBehindBadge } from './accessors.js';
import { addOnBadgeFor, essentialBadgeFor, expandedBadgeFor } from './badge-registry.js';
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

// --- Essential badge --------------------------------------------------------

/** The `/badges/[slug]` route for a base profile-role's Essential badge. */
export function badgeHrefFor(profileSlug: string, roleSlug: string): string | undefined {
	return hrefFor(essentialBadgeFor(profileSlug, roleSlug));
}

/** The claimed-state summary for a base profile-role's Essential badge. */
export function claimedInfoFor(
	profileSlug: string,
	roleSlug: string,
	claims: BadgeClaimSnapshot[]
): ClaimedInfo | undefined {
	return claimedInfo(essentialBadgeFor(profileSlug, roleSlug), claims);
}

/** The display name of a base profile-role's Essential badge. */
export function badgeNameFor(profileSlug: string, roleSlug: string): string | undefined {
	return essentialBadgeFor(profileSlug, roleSlug)?.name;
}

// --- Expanded badge ---------------------------------------------------------

/** The `/badges/[slug]` route for a base profile-role's Expanded badge, if registered. */
export function expandedBadgeHrefFor(profileSlug: string, roleSlug: string): string | undefined {
	return hrefFor(expandedBadgeFor(profileSlug, roleSlug));
}

/** The claimed-state summary for a base profile-role's Expanded badge. */
export function expandedClaimedInfoFor(
	profileSlug: string,
	roleSlug: string,
	claims: BadgeClaimSnapshot[]
): ClaimedInfo | undefined {
	return claimedInfo(expandedBadgeFor(profileSlug, roleSlug), claims);
}

/** The display name of a base profile-role's Complete badge, e.g. "OID4 Wallet — Complete". */
export function expandedBadgeNameFor(profileSlug: string, roleSlug: string): string | undefined {
	return expandedBadgeFor(profileSlug, roleSlug)?.name;
}

// --- Add-on badge -----------------------------------------------------------

/**
 * The `/badges/[slug]` route for one additive's badge **within one base profile
 * and role** — the triple that keys an add-on badge since M15.
 */
export function addOnBadgeHrefFor(
	additiveSlug: string,
	baseProfileSlug: string,
	roleSlug: string
): string | undefined {
	return hrefFor(addOnBadgeFor(additiveSlug, baseProfileSlug, roleSlug));
}

/** The claimed-state summary for an add-on badge. */
export function addOnClaimedInfoFor(
	additiveSlug: string,
	baseProfileSlug: string,
	roleSlug: string,
	claims: BadgeClaimSnapshot[]
): ClaimedInfo | undefined {
	return claimedInfo(addOnBadgeFor(additiveSlug, baseProfileSlug, roleSlug), claims);
}

/** The display name of an add-on badge, e.g. "Data Integrity Cryptosuites — VCALM Wallet". */
export function addOnBadgeNameFor(
	additiveSlug: string,
	baseProfileSlug: string,
	roleSlug: string
): string | undefined {
	return addOnBadgeFor(additiveSlug, baseProfileSlug, roleSlug)?.name;
}

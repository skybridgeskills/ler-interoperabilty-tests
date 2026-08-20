import {
	membershipsOfProfile,
	type MembershipLevel,
	oneOfGroupOf
} from '$lib/interop/scenarios/index.js';
import type { Scenario } from '$lib/interop/scenarios/scenario-schema.js';

import { badgeKey, type BadgeDefinition, type BadgeTier } from './badge-schema.js';

/**
 * The scenarios behind a badge — the completion sub-set it is claimed against.
 *
 * Reuses the catalog's own membership inversion (`membershipsOfProfile`) over the
 * badge's `(profile, role)` key, then keeps only the memberships **its tier
 * scores** (`levelInTier`): `base` the required floor and `oneOf` alternatives,
 * `complete` the same base profile's `optional` set, `additive` the whole
 * additive set. This is the single seam that scopes a badge — the fingerprint,
 * the claim snapshot, and the criteria page all read through it, so a base badge
 * and a complete badge for one `(profile, role)` are two different sets.
 * Catalog order is preserved.
 */
export function scenariosBehindBadge(badge: BadgeDefinition): Scenario[] {
	const { profile, role } = badgeKey(badge);
	return membershipsOfProfile(profile)
		.filter(({ scenario, level }) => scenario.role === role && levelInTier(level, badge.tier))
		.map(({ scenario }) => scenario);
}

/**
 * Whether a membership level belongs to a tier's sub-set. `base` counts the
 * `required` floor and `oneOf` alternatives (one obligation each, gating stops
 * once one passes); `complete` counts the base profile's own `optional` set;
 * `additive` counts every level, because an additive is single-tier.
 */
function levelInTier(level: MembershipLevel, tier: BadgeTier): boolean {
	if (tier === 'complete') return level === 'optional';
	if (tier === 'additive') return true;
	return level === 'required' || oneOfGroupOf(level) !== undefined;
}

/**
 * Every requirement id in the badge's set, sorted so member order cannot perturb
 * a snapshot's `requirementIds` or the "k new since" diff.
 */
export function requirementIdsBehindBadge(badge: BadgeDefinition): string[] {
	return scenariosBehindBadge(badge)
		.flatMap((scenario) => scenario.steps.flatMap((step) => step.requirements.map((r) => r.id)))
		.sort();
}

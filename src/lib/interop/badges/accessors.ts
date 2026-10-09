import {
	baseProfileOf,
	membershipsOfProfile,
	type MembershipLevel,
	oneOfGroupOf
} from '$lib/interop/scenarios/index.js';
import type { Scenario } from '$lib/interop/scenarios/scenario-schema.js';

import {
	addOnBaseProfileOf,
	badgeKey,
	type BadgeDefinition,
	type BadgeTier
} from './badge-schema.js';

/**
 * The scenarios behind a badge — the completion sub-set it is claimed against.
 *
 * Reuses the catalog's own membership inversion (`membershipsOfProfile`) over the
 * badge's completion key, then keeps only the memberships **its tier scores**
 * (`levelInTier`): `essential` the required floor, `expanded` that floor **plus**
 * the same base profile's `optional` set, `add-on` the whole additive set —
 * further narrowed to **one base profile**, because an add-on badge is keyed
 * `(additive, base profile, role)`.
 *
 * That narrowing makes this set **identical to `evaluateAdditiveSlice`'s**, which
 * is the point: the slice used to be a display-only view documented as *"not a
 * badge key"*, and M15 made it the badge key. The two must not drift, so the
 * filter here is the same predicate the slice applies — additive memberships
 * whose scenario's role matches and whose `baseProfileOf` matches.
 *
 * This is the single seam that scopes a badge — the fingerprint, the claim
 * snapshot, and the criteria page all read through it, so an Essential badge and
 * an Expanded badge for one `(profile, role)` are two different sets, **nested**
 * rather than disjoint since Expanded is cumulative. Catalog order is preserved.
 */
export function scenariosBehindBadge(badge: BadgeDefinition): Scenario[] {
	const { profile, role } = badgeKey(badge);
	const addOnBase = addOnBaseProfileOf(badge);
	return membershipsOfProfile(profile)
		.filter(({ scenario, level }) => {
			if (scenario.role !== role || !levelInTier(level, badge.tier)) return false;
			// An add-on badge scores one protocol's share. `baseProfileOf` is total
			// here because catalog rule 4 gives every scenario exactly one base.
			return addOnBase === undefined || baseProfileOf(scenario.memberships) === addOnBase;
		})
		.map(({ scenario }) => scenario);
}

/**
 * Whether a membership level belongs to a tier's sub-set.
 *
 * - `essential` — the `required` floor, plus any `oneOf` alternatives (one
 *   obligation each; gating stops once one passes — dormant since M15).
 * - `expanded` — **cumulative**: that same floor *plus* the profile's own
 *   `optional` set. An Expanded badge means "everything this profile asks of
 *   this role", so its set **nests inside** the Essential badge's rather than
 *   partitioning against it. (M14 scored it against `optional` alone; that made
 *   the badge claimable without the floor.)
 * - `add-on` — every level, because an add-on badge is single-tier.
 *
 * `additive-only` belongs to **no** base-profile tier. It is how a base profile
 * names a scenario it does not claim, so counting it would put an add-on's work
 * inside an Expanded badge that nobody opted into.
 */
function levelInTier(level: MembershipLevel, tier: BadgeTier): boolean {
	if (level === 'additive-only') return tier === 'add-on';
	if (tier === 'expanded') return true;
	if (tier === 'add-on') return true;
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

import type { AdditiveProfileSlug } from '$lib/interop/additive-profile-schema.js';
import type { ProfileSlug, RoleSlug } from '$lib/interop/profile-schema.js';

import { allScenarios } from './all-scenarios.js';
import type { Membership, MembershipLevel } from './membership.js';
import type { Scenario } from './scenario-schema.js';

/** Look up a scenario by URL slug. */
export function scenarioBySlug(slug: string): Scenario | undefined {
	return allScenarios.find((s) => s.slug === slug);
}

/**
 * The scenarios registered for one `(profile, role)` completion set — the unit
 * the meter and the badge are both counted over.
 *
 * `profile` may name a base profile or an additive; a scenario belongs to the
 * set when any of its memberships names that profile. Catalog order is
 * preserved, so authoring order is display order.
 */
export function scenariosFor(
	profile: ProfileSlug | AdditiveProfileSlug,
	role: RoleSlug
): Scenario[] {
	return allScenarios.filter(
		(s) => s.role === role && s.memberships.some((m) => m.profile === profile)
	);
}

/**
 * The derived membership set of a profile: every scenario that names it, and at
 * what level.
 *
 * This is the inversion that makes "a profile is a named, versioned set of
 * memberships" true without storing a list on the profile itself. The same
 * scenario appears in several profiles' sets, at a different level in each.
 */
export function membershipsOfProfile(
	profile: ProfileSlug | AdditiveProfileSlug
): { scenario: Scenario; level: MembershipLevel }[] {
	return allScenarios.flatMap((scenario) => {
		const membership: Membership | undefined = scenario.memberships.find(
			(m) => m.profile === profile
		);
		return membership ? [{ scenario, level: membership.level }] : [];
	});
}

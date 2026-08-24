import type { AdditiveProfile } from './additive-profile-schema.js';
import { allAdditiveProfiles } from './additive-profiles/all-additive-profiles.js';
import type { Profile, RoleSlug } from './profile-schema.js';
import { allProfiles } from './profiles/all-profiles.js';
import { allRoles, type Role } from './roles.js';
import { allScenarios } from './scenarios/all-scenarios.js';
import { allWorkflows, type Workflow } from './workflows.js';

/** Look up a profile by URL slug. */
export function profileBySlug(slug: string): Profile | undefined {
	return allProfiles.find((p) => p.slug === slug);
}

/** Look up a role by URL slug. */
export function roleBySlug(slug: string): Role | undefined {
	return allRoles.find((r) => r.slug === slug);
}

/** Look up a workflow by URL slug. */
export function workflowBySlug(slug: string): Workflow | undefined {
	return allWorkflows.find((w) => w.slug === slug);
}

/** Workflows the given role is the primary participant in. */
export function workflowsForRole(role: RoleSlug): Workflow[] {
	return allWorkflows.filter((w) => w.role === role);
}

/** Look up an additive profile by URL slug. */
export function additiveProfileBySlug(slug: string): AdditiveProfile | undefined {
	return allAdditiveProfiles.find((p) => p.slug === slug);
}

/**
 * Additive profiles that apply to the given base profile slug. The
 * argument is a plain `string` so route loaders can call this without
 * pre-parsing the slug — the comparison still narrows internally via
 * the typed `appliesToBaseProfiles` array.
 */
export function additiveProfilesForBaseProfile(base: string): AdditiveProfile[] {
	return allAdditiveProfiles.filter((p) =>
		(p.appliesToBaseProfiles as readonly string[]).includes(base)
	);
}

/**
 * The roles an additive profile can be demonstrated in — the distinct roles of
 * the scenarios that name it, in catalog role order.
 *
 * This used to read a list the additive carried, declaring a layer per
 * `(role, workflow)`. M13 deleted that field, and the catalog is now the only
 * honest statement of which roles an additive has anything to say about: an
 * additive that no scenario names can be demonstrated in no role at all, which
 * the old shape could not express.
 */
export function rolesOfAdditiveProfile(additive: AdditiveProfile): RoleSlug[] {
	const declared = new Set<RoleSlug>(
		allScenarios
			.filter((s) => s.memberships.some((m) => m.profile === additive.slug))
			.map((s) => s.role)
	);
	return allRoles.filter((r) => declared.has(r.slug)).map((r) => r.slug);
}

/**
 * The additive profiles worth offering for a set of selected roles — those with
 * a scenario in at least one of them.
 *
 * **No selected role means no additive is offered.** An additive layers on a
 * base profile in a specific role; offering one before a role is chosen asks a
 * question the answer to which cannot yet be located anywhere on the page. The
 * homepage filter bar uses this to decide whether the Add-ons dimension exists
 * at all, and the selection store uses it to drop an additive whose last
 * relevant role has been deselected.
 */
export function additiveProfilesForRoles(roles: Iterable<RoleSlug>): AdditiveProfile[] {
	const selected = new Set<RoleSlug>(roles);
	if (selected.size === 0) return [];
	return allAdditiveProfiles.filter((additive) =>
		rolesOfAdditiveProfile(additive).some((role) => selected.has(role))
	);
}

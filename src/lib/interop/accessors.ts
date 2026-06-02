import type { AdditiveProfile } from './additive-profile-schema.js';
import { allAdditiveProfiles } from './additive-profiles/all-additive-profiles.js';
import type {
	Profile,
	ProfileSlug,
	RoleSlug,
	WorkflowChecklist,
	WorkflowSlug
} from './profile-schema.js';
import { allProfiles } from './profiles/all-profiles.js';
import { allRoles, type Role } from './roles.js';
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

/** Profiles that include the given role × workflow combination. */
export function profilesForCombination(role: RoleSlug, workflow: WorkflowSlug): Profile[] {
	return allProfiles.filter((p) =>
		p.checklists.some((c) => c.role === role && c.workflow === workflow)
	);
}

/** Resolve a (role, workflow, profile) checklist; returns undefined if invalid. */
export function combinationFor(
	role: RoleSlug,
	workflow: WorkflowSlug,
	profile: ProfileSlug
): { profile: Profile; checklist: WorkflowChecklist } | undefined {
	const p = profileBySlug(profile);
	if (!p) return undefined;
	const checklist = p.checklists.find((c) => c.role === role && c.workflow === workflow);
	if (!checklist) return undefined;
	return { profile: p, checklist };
}

/** Every valid (role, workflow, profile) combination — for prerender entries(). */
export function allCombinations(): {
	role: RoleSlug;
	workflow: WorkflowSlug;
	profile: ProfileSlug;
}[] {
	return allProfiles.flatMap((p) =>
		p.checklists.map((c) => ({ role: c.role, workflow: c.workflow, profile: p.slug }))
	);
}

/** Workflows present in the given profile, with the primary role for each. */
export function profileWorkflows(profile: Profile): { workflow: Workflow; role: Role }[] {
	return profile.checklists.map((c) => ({
		workflow: workflowBySlug(c.workflow)!,
		role: roleBySlug(c.role)!
	}));
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

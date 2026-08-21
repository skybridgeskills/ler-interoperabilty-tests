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

/**
 * Additive checklists that apply to a base (profile, role, workflow).
 *
 * An additive contributes to a combination iff it applies to the base
 * profile (`appliesToBaseProfiles`) AND declares a checklist for that
 * (role, workflow). Matching ignores the additive checklist's own
 * `profile` field by design — the same checklist can layer on multiple
 * base profiles (e.g. the 4 DI exchange checklists apply to both vcalm
 * and oid4). This accessor is the single source of truth for additive
 * application used by the combined-view UI and the issuer runner.
 */
export function additiveChecklistsForCombination(
	base: ProfileSlug,
	role: RoleSlug,
	workflow: WorkflowSlug
): { additive: AdditiveProfile; checklist: WorkflowChecklist }[] {
	return additiveProfilesForBaseProfile(base).flatMap((additive) => {
		const checklist = additive.checklists.find((c) => c.role === role && c.workflow === workflow);
		return checklist ? [{ additive, checklist }] : [];
	});
}

/**
 * The roles an additive profile can be demonstrated in — the distinct roles
 * across its own checklists, in catalog role order.
 *
 * An additive declares its layer per `(role, workflow)`, so its checklists are
 * the only honest statement of which roles it has anything to say about. The
 * `data-integrity-cryptosuites` bundle covers all three; `open-skill-alignment`
 * covers issuer and verifier only.
 */
export function rolesOfAdditiveProfile(additive: AdditiveProfile): RoleSlug[] {
	const declared = new Set<RoleSlug>(additive.checklists.map((c) => c.role));
	return allRoles.filter((r) => declared.has(r.slug)).map((r) => r.slug);
}

/**
 * The additive profiles worth offering for a set of selected roles — those
 * declaring a checklist for at least one of them.
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

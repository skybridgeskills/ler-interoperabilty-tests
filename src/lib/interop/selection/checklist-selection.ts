import { ProfileSlug, type RoleSlug, type WorkflowSlug } from '$lib/interop/profile-schema.js';
import { allRoles } from '$lib/interop/roles.js';
import { allWorkflows } from '$lib/interop/workflows.js';

/** The user's current role and profile selection. */
export type Selection = { roles: Set<RoleSlug>; profiles: Set<ProfileSlug> };

/** One (role, workflow, profile) checklist row. */
export type ChecklistCombination = {
	role: RoleSlug;
	workflow: WorkflowSlug;
	profile: ProfileSlug;
};

/**
 * Canonical profile order. `ProfileSlug.schema.options` is the ordered array
 * of enum literals exposed by Zod v4 (verified against the installed version).
 */
const profileOrder = ProfileSlug.schema.options as readonly ProfileSlug[];

const roleIndex = new Map<RoleSlug, number>(allRoles.map((r, i) => [r.slug, i]));
const workflowIndex = new Map<WorkflowSlug, number>(allWorkflows.map((w, i) => [w.slug, i]));
const profileIndex = new Map<ProfileSlug, number>(profileOrder.map((p, i) => [p, i]));

/**
 * A combination is active iff BOTH its role AND its profile are selected.
 * An empty selection therefore matches nothing.
 */
export function isCombinationSelected(c: ChecklistCombination, s: Selection): boolean {
	return s.roles.has(c.role) && s.profiles.has(c.profile);
}

function compareCanonical(a: ChecklistCombination, b: ChecklistCombination): number {
	const r = (roleIndex.get(a.role) ?? Infinity) - (roleIndex.get(b.role) ?? Infinity);
	if (r !== 0) return r;
	const w =
		(workflowIndex.get(a.workflow) ?? Infinity) - (workflowIndex.get(b.workflow) ?? Infinity);
	if (w !== 0) return w;
	return (profileIndex.get(a.profile) ?? Infinity) - (profileIndex.get(b.profile) ?? Infinity);
}

/**
 * Order combinations selected-first, then by canonical role → workflow →
 * profile order within each partition. Pure and stable: the input array is
 * never mutated.
 */
export function sortCombinations(
	combos: ChecklistCombination[],
	s: Selection
): ChecklistCombination[] {
	const selected: ChecklistCombination[] = [];
	const unselected: ChecklistCombination[] = [];
	for (const c of combos) {
		if (isCombinationSelected(c, s)) selected.push(c);
		else unselected.push(c);
	}
	selected.sort(compareCanonical);
	unselected.sort(compareCanonical);
	return [...selected, ...unselected];
}

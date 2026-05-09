import { error } from '@sveltejs/kit';

import { allCombinations, combinationFor, roleBySlug, workflowBySlug } from './accessors.js';
import { ProfileSlug, RoleSlug, WorkflowSlug } from './profile-schema.js';

export type ChecklistRouteParams = { workflow: string; profile: string };

/** Build the prerender entries() list for a fixed role. */
export function checklistEntriesFor(role: 'issuer' | 'wallet' | 'verifier') {
	return allCombinations()
		.filter((c) => c.role === role)
		.map(({ workflow, profile }) => ({ workflow, profile }));
}

/** Resolve a checklist or throw a 404. */
export function loadChecklist(
	role: 'issuer' | 'wallet' | 'verifier',
	params: ChecklistRouteParams
) {
	const roleParse = RoleSlug.schema.safeParse(role);
	const workflowParse = WorkflowSlug.schema.safeParse(params.workflow);
	const profileParse = ProfileSlug.schema.safeParse(params.profile);

	if (!roleParse.success || !workflowParse.success || !profileParse.success) {
		error(404, 'Unknown role / workflow / profile.');
	}

	const combo = combinationFor(roleParse.data, workflowParse.data, profileParse.data);
	if (!combo) error(404, 'No checklist for that combination.');

	return {
		role: roleBySlug(roleParse.data)!,
		workflow: workflowBySlug(workflowParse.data)!,
		profile: combo.profile,
		checklist: combo.checklist
	};
}

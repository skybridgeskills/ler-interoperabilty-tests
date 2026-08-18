import type { AdditiveProfileSlug } from '$lib/interop/additive-profile-schema.js';
import type { ProfileSlug, RoleSlug } from '$lib/interop/profile-schema.js';
import type { ScenarioRunRecord } from '$lib/interop/scenario-run/index.js';
import {
	allScenarios,
	type CannotServe,
	type Scenario,
	scenariosFor
} from '$lib/interop/scenarios/index.js';

import { allProfiles } from '../profiles/all-profiles.js';
import { allRoles } from '../roles.js';
import type { ChecklistCombination } from '../selection/checklist-selection.js';

import { evaluateCompletion, type CompletionResult, type ObligationProgress } from './evaluate.js';

/**
 * One completion group to render — a `(profile, role)` heading with its meter
 * and rows. The `result` is M4's, evaluated once here; the component reads it
 * and computes nothing.
 *
 * `profileName` rather than a `Profile` object, so a base profile and an
 * additive (a different type) render through the same widget — the header only
 * needs a name and the role.
 */
export type CompletionGroupData = {
	profileSlug: ProfileSlug | AdditiveProfileSlug;
	profileName: string;
	roleSlug: RoleSlug;
	roleName: string;
	result: CompletionResult;
};

/**
 * The completion groups for a set of base profiles and roles — every
 * `(profile, role)` pair that has at least one scenario, evaluated against the
 * given runs. Empty pairs are omitted: a group with no scenarios is not a
 * meter, it is noise.
 *
 * Profile-major, role-minor, in catalog order, so the homepage reads top to
 * bottom the way the selectors are stacked.
 */
export function completionGroups(args: {
	runs: Record<string, ScenarioRunRecord>;
	blocked?: Record<string, CannotServe>;
}): CompletionGroupData[] {
	const groups: CompletionGroupData[] = [];
	for (const profile of allProfiles) {
		for (const role of allRoles) {
			if (scenariosFor(profile.slug, role.slug).length === 0) continue;
			groups.push({
				profileSlug: profile.slug,
				profileName: profile.name,
				roleSlug: role.slug,
				roleName: role.name,
				result: evaluateCompletion({
					profile: profile.slug,
					role: role.slug,
					runs: args.runs,
					blocked: args.blocked
				})
			});
		}
	}
	return groups;
}

/**
 * The completion groups for one profile across every role it has scenarios in —
 * the profile detail page's version, and the additive case: a slug that names
 * an additive resolves its memberships the same way, which is that additive's
 * own sub-meter promoted to a page.
 */
export function completionGroupsForProfile(args: {
	profileSlug: ProfileSlug | AdditiveProfileSlug;
	profileName: string;
	runs: Record<string, ScenarioRunRecord>;
	blocked?: Record<string, CannotServe>;
}): CompletionGroupData[] {
	const groups: CompletionGroupData[] = [];
	for (const role of allRoles) {
		if (scenariosFor(args.profileSlug, role.slug).length === 0) continue;
		groups.push({
			profileSlug: args.profileSlug,
			profileName: args.profileName,
			roleSlug: role.slug,
			roleName: role.name,
			result: evaluateCompletion({
				profile: args.profileSlug,
				role: role.slug,
				runs: args.runs,
				blocked: args.blocked
			})
		});
	}
	return groups;
}

/**
 * Whether any scenario covers a `(role, workflow, profile)` combination — the
 * scenario's role and workflow match and one of its memberships names the
 * profile.
 */
export function combinationHasScenario(combination: ChecklistCombination): boolean {
	return allScenarios.some(
		(s) =>
			s.role === combination.role &&
			s.workflow === combination.workflow &&
			s.memberships.some((m) => m.profile === combination.profile)
	);
}

/**
 * The obligations of a completion result, grouped by the workflow their
 * scenario belongs to, in first-seen order — so a group renders workflow
 * sub-headings with their rows underneath, never workflow as the top grouping.
 *
 * A `oneOf` group takes the workflow of its first member; its members share a
 * role and workflow by construction.
 */
export function obligationsByWorkflow(
	obligations: ObligationProgress[]
): { workflow: string; obligations: ObligationProgress[] }[] {
	const order: string[] = [];
	const byWorkflow = new Map<string, ObligationProgress[]>();
	for (const progress of obligations) {
		const workflow = scenarioOf(progress).workflow;
		if (!byWorkflow.has(workflow)) {
			byWorkflow.set(workflow, []);
			order.push(workflow);
		}
		byWorkflow.get(workflow)!.push(progress);
	}
	return order.map((workflow) => ({ workflow, obligations: byWorkflow.get(workflow)! }));
}

/** The representative scenario of an obligation — the scenario itself, or a group's first member. */
export function scenarioOf(progress: ObligationProgress): Scenario {
	return progress.obligation.kind === 'scenario'
		? progress.obligation.scenario
		: progress.obligation.members[0];
}

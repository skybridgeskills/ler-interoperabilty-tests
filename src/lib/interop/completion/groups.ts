import type { AdditiveProfileSlug } from '$lib/interop/additive-profile-schema.js';
import type { ProfileSlug, RoleSlug } from '$lib/interop/profile-schema.js';
import type { ScenarioRunRecord } from '$lib/interop/scenario-run/index.js';
import {
	allScenarios,
	type CannotServe,
	isBaseProfile,
	type Scenario,
	scenariosFor
} from '$lib/interop/scenarios/index.js';

import { allAdditiveProfiles } from '../additive-profiles/all-additive-profiles.js';
import { allProfiles } from '../profiles/all-profiles.js';
import { allRoles } from '../roles.js';
import type { ChecklistCombination } from '../selection/checklist-selection.js';

import { evaluateAdditiveSlice, sliceIsEmpty } from './additive-slice.js';
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
	/**
	 * The selected add-ons that apply to this group, each with its slice of work
	 * in **this** base profile. Empty unless the caller passed a selection.
	 *
	 * A slice is **not** a badge key and carries no claim: an additive badge spans
	 * every base profile it applies to, and this is one profile's share of it.
	 */
	additives: AdditiveSliceData[];
};

/** One selected add-on's work inside one `(base profile, role)` group. */
export type AdditiveSliceData = {
	slug: AdditiveProfileSlug;
	name: string;
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
	/**
	 * The add-ons the reader has selected. Each contributes a slice to every group
	 * it actually reaches; omit for no add-on sections at all.
	 */
	additives?: AdditiveProfileSlug[];
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
				}),
				additives: additiveSlicesFor({
					baseProfile: profile.slug,
					role: role.slug,
					selected: args.additives ?? [],
					runs: args.runs,
					blocked: args.blocked
				})
			});
		}
	}
	return groups;
}

/**
 * The slices a group should render, in **catalog order** so two cards never
 * disagree about which add-on comes first.
 *
 * An add-on that reaches this `(base profile, role)` with **no** scenarios is
 * omitted rather than rendered empty: a 0/0 meter is not information, and until
 * additive scenarios are authored that is every add-on. Selecting one and seeing
 * nothing appear is the honest outcome — better than a row of empty sections
 * implying work that does not exist yet.
 */
function additiveSlicesFor(args: {
	baseProfile: ProfileSlug;
	role: RoleSlug;
	selected: AdditiveProfileSlug[];
	runs: Record<string, ScenarioRunRecord>;
	blocked?: Record<string, CannotServe>;
}): AdditiveSliceData[] {
	const slices: AdditiveSliceData[] = [];
	for (const additive of allAdditiveProfiles) {
		if (!args.selected.includes(additive.slug)) continue;
		if (!(additive.appliesToBaseProfiles as readonly string[]).includes(args.baseProfile)) continue;
		const result = evaluateAdditiveSlice({
			additive: additive.slug,
			baseProfile: args.baseProfile,
			role: args.role,
			runs: args.runs,
			blocked: args.blocked
		});
		if (sliceIsEmpty(result)) continue;
		slices.push({ slug: additive.slug, name: additive.name, result });
	}
	return slices;
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
	/**
	 * The reader's selected add-ons. Honoured only for a **base** profile page, so
	 * it matches the homepage. An additive's own page already *is* that additive's
	 * aggregate across every base profile it touches, so nesting slices inside it
	 * would list the same scenarios twice.
	 */
	additives?: AdditiveProfileSlug[];
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
			}),
			additives: isBaseProfile(args.profileSlug)
				? additiveSlicesFor({
						baseProfile: args.profileSlug as ProfileSlug,
						role: role.slug,
						selected: args.additives ?? [],
						runs: args.runs,
						blocked: args.blocked
					})
				: []
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
 * A `oneOf` group takes the workflow of its **first member**. Its members share
 * a role, but as of M11 they no longer share a workflow "by construction": the
 * cross-protocol issuer groups (`osa-issuer-payload`, `dic-issuer-eddsa`,
 * `dic-issuer-ecdsa`) span `direct-credential-issuance` and
 * `credential-issuance` on purpose, because the item they measure is about the
 * payload or the signature and not about the protocol. Such a group therefore
 * renders under one member's workflow heading, with every member listed inside
 * it. That is cosmetic and deliberate — noted here rather than worked around,
 * because grouping is the front page's territory.
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

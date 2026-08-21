import type { AdditiveProfileSlug } from '$lib/interop/additive-profile-schema.js';
import type { ProfileSlug, RoleSlug } from '$lib/interop/profile-schema.js';
import type { ScenarioRunRecord } from '$lib/interop/scenario-run/index.js';
import {
	baseProfileOf,
	type CannotServe,
	membershipsOfProfile
} from '$lib/interop/scenarios/index.js';

import { type CompletionResult, evaluateMemberships } from './evaluate.js';

/**
 * One additive profile's work **within a single base profile and role** — the
 * slice a `(base profile, role)` card can honestly show.
 *
 * An additive badge is keyed `(additive, role)` and spans every base profile it
 * applies to: the Data Integrity bundle covers `vcalm`, `oid4` *and*
 * `ob3-direct-delivery`. A card shows one base profile, so it can only show that
 * profile's share of the additive's work — which is why this is **a view for
 * display and not a badge key**, and why the card renders no claim control for
 * it. Claiming an additive badge stays on the additive's own page, which
 * aggregates every base profile.
 *
 * The slice is well-defined because every scenario names **exactly one** base
 * profile (catalog rule 4), so an additive's set partitions cleanly across the
 * base profiles it touches, with nothing double-counted and nothing orphaned.
 *
 * The additive's own `optional` memberships stay a separate sub-meter, exactly
 * as for a base profile. A slice has no Complete tier — "a complete slice of an
 * additive" is not a thing anyone can claim, and nothing here should imply it.
 */
export function evaluateAdditiveSlice(args: {
	additive: AdditiveProfileSlug;
	baseProfile: ProfileSlug;
	role: RoleSlug;
	/** Persisted runs, keyed by scenario slug. Drift-dropped before it gets here. */
	runs: Record<string, ScenarioRunRecord>;
	/** Scenarios this deployment cannot serve, keyed by scenario slug. */
	blocked?: Record<string, CannotServe>;
}): CompletionResult {
	const memberships = membershipsOfProfile(args.additive).filter(
		(m) =>
			m.scenario.role === args.role && baseProfileOf(m.scenario.memberships) === args.baseProfile
	);

	return evaluateMemberships(memberships, args.runs, args.blocked);
}

/** Whether a slice has any obligations at all — an empty slice renders as nothing. */
export function sliceIsEmpty(result: CompletionResult): boolean {
	return result.obligations.length === 0 && result.optional.obligations.length === 0;
}

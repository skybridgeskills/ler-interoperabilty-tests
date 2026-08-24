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
 * **This slice IS the add-on badge key, as of M15.** It was introduced as a view
 * for display and explicitly *not* a badge key, back when an add-on badge was
 * keyed `(additive, role)` and spanned every base profile — a card showing one
 * profile could then only show that profile's share, and claiming happened on the
 * additive's own aggregate page. That spanning badge is gone: an add-on badge is
 * now keyed `(additive, base profile, role)`, so *DIC VCALM Wallet* is exactly
 * this slice and the card that renders it carries its own claim control.
 *
 * `scenariosBehindBadge` applies the same predicate for the `add-on` tier. The
 * two must not drift — a meter and a badge disagreeing is the one thing the
 * completion model exists to prevent.
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

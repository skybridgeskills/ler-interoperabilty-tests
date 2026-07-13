import type { StepRunState } from '$lib/interop/index.js';
import type { RequirementStatus } from '$lib/interop/run-history/requirement-status.js';
import type { VerifierCheckOutcome } from '$lib/interop/verifier-run/index.js';
import type { CheckOutcome } from '$lib/server/domain/issuer-runner/check-outcome.js';

import {
	outcomeToRequirementStatus,
	stepStateToRequirementStatus,
	verifierOutcomeToRequirementStatus
} from './requirement-status-view.js';
import type { RequirementStatusView } from './requirement-status-view.js';

/**
 * Drop the live-only `raw` body from a {@link RequirementStatusView}, leaving
 * the persisted {@link RequirementStatus} shape. Record-time statuses never
 * carry `raw` (the collapsible response body is not persisted).
 */
function stripRaw({ raw: _raw, ...status }: RequirementStatusView): RequirementStatus {
	return status;
}

/**
 * Issuer flow: build a persisted `statuses` map from per-requirement
 * {@link CheckOutcome}s keyed by requirement id, reusing
 * {@link outcomeToRequirementStatus}. A requirement with no outcome maps to
 * `pending`. Accepts the combined requirement set (base + additives) so
 * additive rows are included.
 */
export function statusesFromOutcomes(
	requirements: { id: string }[],
	outcomesById: Record<string, CheckOutcome>
): Record<string, RequirementStatus> {
	const statuses: Record<string, RequirementStatus> = {};
	for (const { id } of requirements) {
		statuses[id] = stripRaw(outcomeToRequirementStatus(outcomesById[id]));
	}
	return statuses;
}

/**
 * Verifier flow: build a persisted `statuses` map from per-requirement
 * {@link VerifierCheckOutcome}s keyed by requirement id, reusing
 * {@link verifierOutcomeToRequirementStatus} (which keeps `attested` and the
 * deferred-revoked `skipped` treatment). A requirement with no outcome maps to
 * `pending`. Accepts the combined requirement set (base + additives).
 */
export function statusesFromVerifierOutcomes(
	requirements: { id: string }[],
	outcomesById: Record<string, VerifierCheckOutcome>
): Record<string, RequirementStatus> {
	const statuses: Record<string, RequirementStatus> = {};
	for (const { id } of requirements) {
		statuses[id] = stripRaw(verifierOutcomeToRequirementStatus(outcomesById[id]));
	}
	return statuses;
}

/**
 * Wallet-acceptance flow: build a persisted `statuses` map by fanning each
 * step's {@link StepRunState} across that step's requirements via
 * {@link stepStateToRequirementStatus} (step-level granularity — every
 * requirement in a step shares the step's status). `detailFor` optionally
 * supplies a per-state message. A step with no matching `perStep` entry maps its
 * requirements to `pending`. Accepts the combined step/requirement set.
 */
export function statusesFromStepStates(
	steps: { requirements: { id: string }[] }[],
	perStep: StepRunState[],
	detailFor?: (state: StepRunState) => { message?: string } | undefined
): Record<string, RequirementStatus> {
	const statuses: Record<string, RequirementStatus> = {};
	steps.forEach((step, i) => {
		const state = perStep[i] ?? 'pending';
		const status = stripRaw(stepStateToRequirementStatus(state, detailFor?.(state)));
		for (const { id } of step.requirements) {
			statuses[id] = status;
		}
	});
	return statuses;
}

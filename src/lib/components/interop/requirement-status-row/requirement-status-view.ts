import { outcomeBadge } from '$lib/components/interop/issuer-runner/requirement-report/outcome-status-badge.js';
import type { StepRunState } from '$lib/interop/index.js';
import type { CheckOutcome } from '$lib/server/domain/issuer-runner/check-outcome.js';

/** RFC 2119 conformance level for a checklist requirement. */
export type RequirementLevel = 'MUST' | 'SHOULD' | 'MAY';

/**
 * Semantic status of one requirement row, independent of colors/markup. The
 * row component maps `tone` to dot + pill classes; the mappers below produce it
 * from either a resolved {@link CheckOutcome} (issuer flow) or a
 * {@link StepRunState} (external-wallet flow).
 */
export type RequirementStatusTone =
	| 'pass'
	| 'warn'
	| 'fail'
	| 'pending'
	| 'in-flight'
	| 'skipped'
	| 'n/a';

/** Normalized, presentation-ready status for one requirement row. */
export type RequirementStatusView = {
	tone: RequirementStatusTone;
	/** Uppercase pill text, e.g. `PASS`, `IN PROGRESS`, `PENDING`, `FAIL · MUST`. */
	label: string;
	/** Inline message (fail/warn) or details message; optional. */
	message?: string;
	/** Raw body for the collapsible `<details>`; optional. */
	raw?: unknown;
};

/**
 * Issuer flow: derive the row status from a resolved check outcome. Reuses
 * {@link outcomeBadge} as the single source of truth for the pill label so the
 * issuer flow's text (`PASS`, `FAIL · MUST`, `N/A`, `WARN`) is unchanged. An
 * absent outcome means the step has not run yet → `pending`.
 */
export function outcomeToRequirementStatus(
	outcome: CheckOutcome | undefined,
	raw?: unknown
): RequirementStatusView {
	if (!outcome) {
		return { tone: 'pending', label: 'PENDING', raw };
	}
	const badge = outcomeBadge(outcome);
	const tone: RequirementStatusTone =
		outcome.status === 'pass'
			? 'pass'
			: outcome.status === 'warn'
				? 'warn'
				: outcome.status === 'n/a'
					? 'n/a'
					: 'fail';
	return { tone, label: badge.label, message: outcome.message, raw };
}

/**
 * Wallet flow: derive the row status from the parent step's run state. The
 * external-wallet path only observes step-level progress, so every requirement
 * in a step shares that step's status (step-level granularity — the caller
 * supplies honest, step-scoped copy via `details`).
 */
export function stepStateToRequirementStatus(
	state: StepRunState,
	details?: { message?: string; raw?: unknown }
): RequirementStatusView {
	const map: Record<StepRunState, { tone: RequirementStatusTone; label: string }> = {
		pending: { tone: 'pending', label: 'PENDING' },
		'in-flight': { tone: 'in-flight', label: 'IN PROGRESS' },
		complete: { tone: 'pass', label: 'DONE' },
		failed: { tone: 'fail', label: 'FAILED' },
		skipped: { tone: 'skipped', label: 'SKIPPED' }
	};
	const { tone, label } = map[state];
	return { tone, label, message: details?.message, raw: details?.raw };
}

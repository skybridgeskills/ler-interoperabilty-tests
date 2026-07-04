import { outcomeBadge } from '$lib/components/interop/issuer-runner/requirement-report/outcome-status-badge.js';
import type { StepRunState } from '$lib/interop/index.js';
import type { VerifierCheckOutcome } from '$lib/interop/verifier-run/index.js';
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
	/**
	 * Set when the row was resolved from the operator's attestation of their own
	 * system's behavior (verifier acceptance passes) rather than an automated
	 * check — the row renders a small ATTESTED pill next to the status label.
	 */
	attested?: boolean;
};

/**
 * The single source of truth for tone → status colors, shared by
 * `RequirementStatusRow` (leading dot + trailing label) and `RunStatusIndicator`
 * (inline `● LABEL` at the step level), so the two can never drift.
 *
 * Cool blue is reserved for the requirement **level** badge and never appears
 * here: results read green (pass), red (MUST fail), amber (warn / advisory fail),
 * warm orange (in-flight), or neutral (pending / n-a / skipped). The optional
 * `level` splits fail severity — a MUST fail is red, a SHOULD/MAY fail is amber
 * (advisory). Pending is a hollow ring; every resolved state is a filled dot.
 */
export function runStatusToneClasses(
	tone: RequirementStatusTone,
	level?: RequirementLevel
): { dot: string; label: string } {
	const advisoryFail = tone === 'fail' && level !== undefined && level !== 'MUST';
	switch (tone) {
		case 'pass':
			return { dot: 'bg-success', label: 'text-success' };
		case 'warn':
			return { dot: 'bg-warning', label: 'text-warning' };
		case 'fail':
			return advisoryFail
				? { dot: 'bg-warning', label: 'text-warning' }
				: { dot: 'bg-destructive', label: 'text-destructive' };
		case 'in-flight':
			return { dot: 'bg-progress animate-pulse', label: 'text-progress' };
		case 'skipped':
			return {
				dot: 'bg-muted-foreground/30',
				label: 'text-muted-foreground line-through decoration-muted-foreground/40'
			};
		case 'n/a':
			return { dot: 'bg-muted-foreground/40', label: 'text-muted-foreground' };
		case 'pending':
		default:
			// Hollow ring for not-yet-run; resolved states are filled dots.
			return { dot: 'border border-muted-foreground/40', label: 'text-muted-foreground' };
	}
}

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
 * The direct-delivery acceptance row that has no runnable pass yet
 * (status-list support is planned). Client-side mirror of the scoring
 * engine's row registry — do NOT import from `$lib/server` here; this
 * file is used by client code.
 */
export const VERIFIER_DEFERRED_REVOKED_ROW_ID = 'ob3-direct-delivery.verifier-rejects-revoked';

/**
 * Every deferred revoked acceptance row across the scorable verifier
 * profiles — an explicit list (no id-pattern matching) mirroring the
 * server row registry's `revoked` entries. New runnable verifier
 * profiles must add their revoked row id here for the skipped rendering
 * to apply.
 */
export const VERIFIER_DEFERRED_REVOKED_ROW_IDS: readonly string[] = [
	VERIFIER_DEFERRED_REVOKED_ROW_ID,
	'oid4.verifier-rejects-revoked'
];

/**
 * Verifier flow: derive the row status from a scored verifier outcome.
 * Same tone/label mapping as {@link outcomeToRequirementStatus}, plus:
 *
 * - `source === 'attested'` sets `attested` so the row shows the ATTESTED pill.
 * - the deferred revoked row (its id + `n/a`) renders with the `skipped` tone
 *   (line-through) instead of a plain N/A, carrying the engine's deferral note.
 */
export function verifierOutcomeToRequirementStatus(
	outcome: VerifierCheckOutcome | undefined,
	raw?: unknown
): RequirementStatusView {
	if (!outcome) {
		return { tone: 'pending', label: 'PENDING', raw };
	}
	if (VERIFIER_DEFERRED_REVOKED_ROW_IDS.includes(outcome.id) && outcome.status === 'n/a') {
		return { tone: 'skipped', label: 'SKIPPED', message: outcome.message, raw };
	}
	const view = outcomeToRequirementStatus(outcome, raw);
	return outcome.source === 'attested' ? { ...view, attested: true } : view;
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

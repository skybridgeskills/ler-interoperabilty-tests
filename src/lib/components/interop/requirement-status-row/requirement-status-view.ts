import { outcomeBadge } from '$lib/components/interop/issuer-runner/requirement-report/outcome-status-badge.js';
import type { StepRunState } from '$lib/interop/index.js';
import type {
	RequirementStatus,
	RequirementStatusTone
} from '$lib/interop/run-history/requirement-status.js';
import type { VerifierCheckOutcome } from '$lib/interop/verifier-run/index.js';
import type { CheckOutcome } from '$lib/server/domain/issuer-runner/check-outcome.js';

// The persisted status type + tone union now live framework- and server-free in
// `$lib/interop/run-history/requirement-status.ts`. Re-exported here so existing
// component imports keep resolving; the mappers below (which need `CheckOutcome`)
// stay in `components/`.
export type { RequirementStatusTone };

/** RFC 2119 conformance level for a checklist requirement. */
export type RequirementLevel = 'MUST' | 'SHOULD' | 'MAY';

/**
 * The live, in-memory superset of the persisted {@link RequirementStatus}: it
 * adds `raw` (the collapsible `<details>` body) which is never persisted. The
 * mappers below return this; only `raw` is dropped when writing run history.
 */
export type RequirementStatusView = RequirementStatus & {
	/** Raw body for the collapsible `<details>`; optional, live-only. */
	raw?: unknown;
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
	'oid4.verifier-rejects-revoked',
	'vcalm.verifier-rejects-revoked'
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

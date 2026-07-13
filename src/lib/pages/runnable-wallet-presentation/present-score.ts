import type { StepRunState } from '$lib/interop/index.js';
import type { ProfileSlug } from '$lib/interop/profile-schema.js';
import type { CheckOutcome } from '$lib/server/domain/issuer-runner/check-outcome.js';
import type { IssuerRunnerReport } from '$lib/server/domain/issuer-runner/issuer-runner-report.js';

/** A settled present-score result carries the per-requirement report + verdict. */
export type PresentScoreSettled = {
	settled: true;
	state: 'complete' | 'invalid';
	report: IssuerRunnerReport;
	failingMustCount: number;
};

/** An un-settled result: the exchange hasn't reached a verdict — keep polling. */
export type PresentScorePending = { settled: false; state: 'pending' | 'active' };

export type PresentScoreResult = PresentScoreSettled | PresentScorePending;

/** Thrown on a non-2xx from `POST /api/wallet-runner/present-score`. */
export class PresentScoreError extends Error {
	constructor(
		message: string,
		public readonly hint?: string
	) {
		super(message);
		this.name = 'PresentScoreError';
	}
}

/**
 * Score an observed verify (presentation) exchange via the P3 endpoint. Resolves
 * to `{ settled: false }` while the exchange is still in flight (the caller keeps
 * polling — never a spurious fail), or the settled report on `complete`/`invalid`.
 * Throws {@link PresentScoreError} on an HTTP failure.
 */
export async function fetchPresentScore(args: {
	exchangeId: string;
	profile: ProfileSlug;
	workflowId?: 'claim' | 'verify';
}): Promise<PresentScoreResult> {
	const res = await fetch('/api/wallet-runner/present-score', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			exchangeId: args.exchangeId,
			profile: args.profile,
			workflowId: args.workflowId ?? 'verify'
		})
	});
	if (!res.ok) {
		const body = (await res.json().catch(() => ({}))) as { message?: string; hint?: string };
		throw new PresentScoreError(
			body.message ?? `Present-score responded ${res.status}`,
			body.hint ?? 'Check the transaction service logs (`docker logs lits-transaction-service`).'
		);
	}
	return (await res.json()) as PresentScoreResult;
}

/** Index every outcome in a settled report by its requirement id. */
export function outcomesById(report: IssuerRunnerReport): Record<string, CheckOutcome> {
	return Object.fromEntries(report.groups.flatMap((g) => g.outcomes).map((o) => [o.id, o]));
}

/**
 * Per-step indicator states derived from the report's per-requirement outcomes:
 * `failed` if any requirement failed, `complete` when all resolved without a
 * failure, `in-flight` for partial, `pending` when none resolved.
 */
export function stepStatesFromReport(
	steps: { requirements: { id?: string }[] }[],
	byId: Record<string, CheckOutcome>
): StepRunState[] {
	return steps.map((step) => {
		const outs = step.requirements
			.map((r) => (r.id ? byId[r.id] : undefined))
			.filter((o): o is CheckOutcome => !!o);
		if (outs.some((o) => o.status === 'fail')) return 'failed';
		if (step.requirements.length > 0 && outs.length === step.requirements.length) return 'complete';
		if (outs.length > 0) return 'in-flight';
		return 'pending';
	});
}

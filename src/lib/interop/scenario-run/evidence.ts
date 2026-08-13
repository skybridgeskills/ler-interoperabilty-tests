import type { RunnerExchangeView } from '$lib/interop/runner-state.js';

/**
 * What one step produced, and the only thing an `automatic` check may read.
 *
 * Absent fields mean "this step did not produce that", not "false" — a pure
 * question step has no exchange at all, and a step whose action never reached
 * the wire has no transport result.
 */
export type StepEvidence = {
	stepId: string;
	/** The exchange record view. Already client-safe; absent for a question step. */
	exchange?: RunnerExchangeView;
	/** What actually moved — the credential issued, or the presentation received. */
	artifact?: unknown;
	/** Transport-level outcome, independent of what the exchange record says. */
	transport?: { delivered: boolean; error?: { message: string } };
};

/**
 * Every step's evidence so far, keyed by step id.
 *
 * A map rather than "the current step's evidence" on purpose: a check may read
 * **prior** steps, which is what makes a round-trip scenario expressible —
 * "the presentation contains the credential minted in step 1" is a check over
 * two steps' evidence. Nothing shipped crosses steps yet; the shape admits it
 * so that arriving at round-trip is not a rewrite.
 */
export type RunEvidence = {
	steps: Record<string, StepEvidence>;
};

/** An empty evidence set — the state a run starts in. */
export function emptyEvidence(): RunEvidence {
	return { steps: {} };
}

/** Record one step's evidence, replacing anything previously held for it. */
export function withStepEvidence(evidence: RunEvidence, step: StepEvidence): RunEvidence {
	return { steps: { ...evidence.steps, [step.stepId]: step } };
}

/** What a step produced, or `undefined` if it has produced nothing yet. */
export function evidenceForStep(evidence: RunEvidence, stepId: string): StepEvidence | undefined {
	return evidence.steps[stepId];
}

/** The exchange a step drove, or `undefined` for a question step or an unstarted one. */
export function exchangeForStep(
	evidence: RunEvidence,
	stepId: string
): RunnerExchangeView | undefined {
	return evidence.steps[stepId]?.exchange;
}

/** The artifact a step moved, or `undefined`. */
export function artifactForStep(evidence: RunEvidence, stepId: string): unknown {
	return evidence.steps[stepId]?.artifact;
}

/** Read an exchange variable by name, narrowing nothing — checks defend themselves. */
export function exchangeVariable(evidence: RunEvidence, stepId: string, name: string): unknown {
	return exchangeForStep(evidence, stepId)?.variables?.[name];
}

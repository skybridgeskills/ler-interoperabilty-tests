import type { RunnerExchangeView } from '$lib/interop/runner-state.js';

/** One host's TLS posture, as observed by the present transport. Client-safe. */
export type TlsSummary = {
	/** The host negotiated TLS 1.2 or 1.3. */
	atLeastTls12: boolean;
	/** The negotiated protocol string, when known (`TLSv1.3`). */
	protocol?: string;
	/** Why the probe could not confirm TLS 1.2, when it couldn't. */
	error?: string;
};

/**
 * The facts a `present-to-verifier` step observed while engaging the operator's
 * verifier — the request half. A **client-safe** summary (plain data, no server
 * types): the present route on the server derives it from the live exchange and
 * hands it back, and the vcalm floor `automatic` checks read it. Absent fields
 * are not "false" — the whole summary is absent until the step presents.
 */
export type VerifierRequestSummary = {
	/** Which live transport engaged the verifier. `'oid4vp'` arrives in M10b. */
	transport: 'vcalm';
	/** The interaction URL advertised a `vcapi` exchange endpoint. */
	vcapiAdvertised: boolean;
	/** The exchange returned a `verifiablePresentationRequest`. */
	vprReceived: boolean;
	/** The VPR's QueryByExample matched an OpenBadgeCredential. */
	vprMatched: boolean;
	/** Why the query did not match, when it didn't. */
	matchReason?: string;
	/** The VPR carried a DIDAuthentication query. */
	didAuth: boolean;
	/** TLS on the interaction host. */
	requestTls: TlsSummary;
	/** TLS on the `vcapi` host. */
	responseTls: TlsSummary;
};

/**
 * The delivery half of a `present-to-verifier` step: did the signed credential
 * reach the verifier's exchange? A transport miss is `submitted: false` with a
 * reason, **never** an error — the operator retries. Client-safe.
 */
export type VerifierPresentResult = {
	submitted: boolean;
	/** The exchange endpoint's HTTP status, when the submission reached it. */
	transportStatus?: number;
	/** Why the submission did not land, when it didn't. */
	error?: { message: string };
};

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
	/**
	 * A `present-to-verifier` step's observed request — what the operator's
	 * verifier asked for. The vcalm floor checks read this.
	 */
	verifierRequest?: VerifierRequestSummary;
	/** A `present-to-verifier` step's delivery result. The delivery check reads this. */
	verifierPresent?: VerifierPresentResult;
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

/** The verifier request a `present-to-verifier` step observed, or `undefined`. */
export function verifierRequestForStep(
	evidence: RunEvidence,
	stepId: string
): VerifierRequestSummary | undefined {
	return evidence.steps[stepId]?.verifierRequest;
}

/** The delivery result of a `present-to-verifier` step, or `undefined`. */
export function verifierPresentForStep(
	evidence: RunEvidence,
	stepId: string
): VerifierPresentResult | undefined {
	return evidence.steps[stepId]?.verifierPresent;
}

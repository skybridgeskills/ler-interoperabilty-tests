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
 * The facts a **VCALM** `present-to-verifier` step observed — its request half.
 * A **client-safe** summary (plain data, no server types): the present route
 * derives it from the live VC-API exchange, and the vcalm floor `automatic`
 * checks read it.
 */
export type VcalmRequestSummary = {
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
 * The facts an **OID4VP** `present-to-verifier` step observed while inspecting
 * the pasted authorization request — its request half (the floor). Client-safe;
 * the present leaf computes each field, and the oid4 floor `automatic` checks
 * read them. Unlike VCALM (whose floor rides on a VC-API fetch), the OID4 floor
 * comes from inspecting the pasted `openid4vp://` request in the same present.
 */
export type Oid4RequestSummary = {
	transport: 'oid4vp';
	/** How the pasted input carried the request. */
	requestForm: 'inline' | 'by-reference';
	/**
	 * The request parsed **and** validated as an OID4VP authorization request
	 * (the request-endpoint row). `false` means the paste was a link/JSON that
	 * failed the OID4VP shape or a by-reference fetch failed — scored, not thrown.
	 */
	requestResolved: boolean;
	/** The `presentation_definition` matched a seeded OpenBadgeCredential. */
	matchable: boolean;
	/** Why the presentation definition did not match, when it didn't. */
	matchReason?: string;
	/**
	 * DI VP format posture. `di` = a `ldp_vp`/`di_vp` format is pinned; `jwt-only`
	 * = only JWT formats are declared (a DI-proof OB3 cannot be presented — fails);
	 * `unpinned` = nothing, or a mixed non-JWT set, is declared (passes — don't
	 * over-fail a lenient verifier).
	 */
	diVpFormat: 'di' | 'jwt-only' | 'unpinned';
	/**
	 * TLS on the request endpoint. For an **inline** request there is no endpoint,
	 * so the leaf writes a synthetic met summary — the SHOULD check reads inline
	 * as met (nothing to fault).
	 */
	requestTls: TlsSummary;
	/** TLS on the `response_uri` endpoint (always present — the credential's transport). */
	responseTls: TlsSummary;
};

/**
 * The request half a `present-to-verifier` step observed — a **client-safe,
 * transport-discriminated union**. One evidence slot, one accessor
 * ({@link verifierRequestForStep}); each transport's checks narrow on
 * `transport` before reading their fields. The whole summary is absent until the
 * step presents.
 */
export type VerifierRequestSummary = VcalmRequestSummary | Oid4RequestSummary;

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

/** Facts common to every issuer intake, whatever the transport. Client-safe. */
type IssuerFlowCommon = {
	/** `verifier-core` verified the received credential. */
	verified: boolean;
	/** Why it did not verify, when it didn't. */
	verifyErrors?: string[];
};

/**
 * The facts a **direct** (paste) issuer intake observed. There is no wire, so
 * the only observation beyond the credential itself is whether it verified.
 */
export type DirectIntakeSummary = IssuerFlowCommon & { transport: 'direct' };

/**
 * The facts a **VCALM** `receive-from-issuer` step observed on the wire: the
 * operator's issuer drove a VC-API exchange, the suite engaged it as holder, and
 * these are the conformance facts the vcalm issuer checks read. Client-safe.
 */
export type VcalmIssuerSummary = IssuerFlowCommon & {
	transport: 'vcalm';
	/** The pasted interaction URL resolved and advertised its protocols. */
	interactionFetched: boolean;
	/**
	 * The participation (interaction) endpoint answered. Derived from the same
	 * single driver probe as {@link VcalmIssuerSummary.interactionFetched} — two
	 * checklist rows over one observation, and both checks say so.
	 */
	participationOk: boolean;
	/** The advertised protocols included a `vcapi` exchange endpoint. */
	vcapiAdvertised: boolean;
	/** The issuer asked the suite to authenticate a DID. */
	didAuthRequested: boolean;
	/** A challenge came back but no explicit DIDAuthentication query was in the VPR. */
	didAuthQueryMissing?: boolean;
	/** TLS on the interaction host. */
	interactionTls: TlsSummary;
	/** The holder DID the suite authenticated with, when it got that far. */
	holderDid?: string;
	/** `credentialSubject.id` of the delivered credential, for the binding check. */
	subjectId?: string;
};

/**
 * The facts an **OID4VCI** `receive-from-issuer` step observed: the suite
 * redeemed the operator's pre-authorized-code offer as a wallet would, and these
 * are the metadata and endpoint facts the oid4 issuer checks read. Client-safe —
 * note there is deliberately **no access token here**, only whether one was
 * redeemed.
 */
export type Oid4IssuerSummary = IssuerFlowCommon & {
	transport: 'oid4vci';
	/** The issuer's credential-issuer metadata resolved and named a credential endpoint. */
	metadataReachable: boolean;
	/** The metadata advertised a `di_vp` key-proof type. */
	diVpOffered: boolean;
	/** Key-proof types the issuer metadata advertised, for the message. */
	proofTypesOffered: string[];
	/** Signing algorithms the metadata advertised for `di_vp` key proofs. */
	diVpSigningAlgs: string[];
	/** At least one advertised `di_vp` signing alg is in the rdfc bundle. */
	diVpSigningAlgInBundle: boolean;
	/** The pre-authorized code was exchanged for an access token. */
	preAuthCodeRedeemed: boolean;
	/** A credential came back from the credential endpoint. */
	credentialDelivered: boolean;
	/** The credential endpoint's HTTP status, when it answered. */
	credentialStatus?: number;
	/** TLS on the issuer host — metadata, token and credential endpoints share it. */
	issuerTls: TlsSummary;
	/** The holder DID the suite proved possession of, when it got that far. */
	holderDid?: string;
	/** `credentialSubject.id` of the delivered credential, for the binding check. */
	subjectId?: string;
};

/**
 * The wire facts a `receive-from-issuer` step observed — a **client-safe,
 * transport-discriminated union**, exactly as {@link VerifierRequestSummary} is
 * for `present-to-verifier`. One evidence slot, one accessor
 * ({@link issuerFlowForStep}); each transport's checks narrow on `transport`
 * before reading their fields.
 *
 * Deliberately **only** the wire facts: the received credential rides the
 * existing `artifact` slot ("what actually moved") and delivery success/failure
 * rides the existing `transport` slot, so there is no third place to look for
 * either.
 */
export type IssuerFlowSummary = DirectIntakeSummary | VcalmIssuerSummary | Oid4IssuerSummary;

/**
 * One observed request/response on the wire, as shown to the operator.
 *
 * **Display only. No `automatic` check may read a trace.** Every check reads the
 * transport summaries above, which the leaf computes server-side from the *full*
 * response before this projection truncates anything. That separation is what
 * makes the display cap safe: truncating a body changes what is shown and
 * nothing that is scored.
 *
 * `method`, `url`, `status` and `body` are all optional because a synthesised
 * stage — one reconstructed from a driver that kept the fact but not the
 * exchange — legitimately has fewer of them than a transcribed one.
 */
export type TraceStage = {
	/** Which leg of the flow this was, in the transport's own words (`token`, `didauth`). */
	name: string;
	/** What to call it in the panel (`Token request`). */
	label: string;
	method?: 'GET' | 'POST';
	url?: string;
	status?: number;
	/** Whether this leg did what it was supposed to. Drives the panel's marker. */
	ok: boolean;
	/** The response body, possibly truncated — see {@link TraceStage.truncated}. */
	body?: unknown;
	/** Set when `body` was cut to the display cap; carries the original size. */
	truncated?: { originalBytes: number };
	/** Why this leg did not succeed, when it didn't. */
	error?: string;
};

/**
 * The ordered wire trace of one step, oldest first — what the transport actually
 * did, for the operator to read when a result needs explaining.
 *
 * **Live-only.** It is never written to `ScenarioRunRecord`, exactly as the
 * checklist era's `raw` never was: a stored run is a list of outcomes, not a
 * packet capture. A step that stopped early carries only the stages it reached,
 * and the last stage present is where it stopped — which is the point.
 */
export type WireTrace = { stages: TraceStage[] };

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
	/** A `receive-from-issuer` step's observed wire facts. The issuer checks read this. */
	issuerFlow?: IssuerFlowSummary;
	/**
	 * What the step's transport actually did, for the operator's Details panel.
	 * Absent for a step with no wire — a `direct` intake, a pure question step.
	 * Never scored and never persisted; see {@link TraceStage}.
	 */
	trace?: WireTrace;
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

/** The wire trace a step observed, or `undefined` for a step with no wire. */
export function traceForStep(evidence: RunEvidence, stepId: string): WireTrace | undefined {
	return evidence.steps[stepId]?.trace;
}

/** The wire facts a `receive-from-issuer` step observed, or `undefined`. */
export function issuerFlowForStep(
	evidence: RunEvidence,
	stepId: string
): IssuerFlowSummary | undefined {
	return evidence.steps[stepId]?.issuerFlow;
}

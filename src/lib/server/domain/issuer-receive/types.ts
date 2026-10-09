import type { IssuerFlowSummary, WireTrace } from '$lib/interop/scenario-run/index.js';

/**
 * What one issuer intake produced, whatever the transport.
 *
 * `flow` is the client-safe wire summary the issuer checks read; `credential` is
 * what actually arrived (it rides `StepEvidence.artifact`, so the payload checks
 * are transport-independent); `delivered` plus `error` ride
 * `StepEvidence.transport`. There is deliberately no fourth *scored* slot — a
 * protocol failure is `delivered: false` with a reason, scored rather than
 * thrown.
 *
 * `trace` is the exception that proves it: it is returned for the operator to
 * read, is **never** scored, and is absent for a transport with no wire.
 */
export type ReceiveFromIssuerResult = {
	flow: IssuerFlowSummary;
	/** The received credential, or `undefined` when nothing arrived. */
	credential?: unknown;
	delivered: boolean;
	error?: { message: string };
	/**
	 * What the transport did, for the operator's Details panel. Display only —
	 * no `automatic` check may read it. Absent for the `direct` intake, which has
	 * no wire.
	 */
	trace?: WireTrace;
};

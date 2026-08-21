import type { IssuerFlowSummary } from '$lib/interop/scenario-run/index.js';

/**
 * What one issuer intake produced, whatever the transport.
 *
 * `flow` is the client-safe wire summary the issuer checks read; `credential` is
 * what actually arrived (it rides `StepEvidence.artifact`, so the payload checks
 * are transport-independent); `delivered` plus `error` ride
 * `StepEvidence.transport`. There is deliberately no fourth slot — a protocol
 * failure is `delivered: false` with a reason, scored rather than thrown.
 */
export type ReceiveFromIssuerResult = {
	flow: IssuerFlowSummary;
	/** The received credential, or `undefined` when nothing arrived. */
	credential?: unknown;
	delivered: boolean;
	error?: { message: string };
};

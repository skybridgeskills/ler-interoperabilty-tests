import type { IssuerFlowSummary, StepEvidence } from '$lib/interop/scenario-run/index.js';
import type { ScenarioStep } from '$lib/interop/scenarios/index.js';

import type { RunnerError } from './exchange-step.js';

export type ReceiveStepCallbacks = {
	/** A credential arrived; the step's evidence is ready for `settleStep`. */
	onSettled: (evidence: StepEvidence) => void;
	/**
	 * Nothing arrived (the issuer refused, or the exchange never delivered) — not
	 * an error. The step stays in-flight so the operator can supply fresh input
	 * and try again.
	 */
	onMiss: (note: string) => void;
	/** The receive route failed outright. The run becomes unrecordable — see D2. */
	onFailed: (error: RunnerError) => void;
};

const RECEIVE_HINT =
	'Check the server logs — the suite engages your issuer with the input you pasted and verifies whatever it delivers.';

/**
 * Drive a `receive-from-issuer` step. Like `present-step` (and unlike
 * `direct-step`, which the suite starts on its own), this waits for the
 * operator's **run-time input** — the credential their issuer produced, or the
 * URL it handed them — so it exposes a `receive(input)` the field calls rather
 * than running on construction.
 *
 * A delivery miss (`delivered: false`) is not a failure: it calls `onMiss`, the
 * step stays in-flight, and the operator can try again with fresh input. Only
 * the route erroring (or the network) is `onFailed`.
 *
 * The received credential is written to `StepEvidence.artifact`, which is what
 * makes the payload checks transport-independent; the wire facts ride
 * `issuerFlow`, and the delivery outcome rides `transport`.
 *
 * Returns a handle whose `stop()` abandons any in-flight request's callbacks.
 */
export function startReceiveStep(
	step: ScenarioStep,
	callbacks: ReceiveStepCallbacks
): { receive: (input: string) => void; stop: () => void } {
	let stopped = false;

	function receive(input: string): void {
		const action = step.action;
		if (action?.kind !== 'receive-from-issuer') {
			callbacks.onFailed({ message: `Step "${step.id}" is not a receive-from-issuer step.` });
			return;
		}

		void (async () => {
			try {
				const res = await fetch('/api/scenario-runner/receive', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						transport: action.transport,
						input,
						...(action.keyProofSuite ? { keyProofSuite: action.keyProofSuite } : {})
					})
				});
				if (stopped) return;

				if (!res.ok) {
					const failure = (await res.json().catch(() => ({}))) as Partial<RunnerError> & {
						message?: string;
					};
					callbacks.onFailed({
						message: failure.message ?? `Receiving responded ${res.status}`,
						hint: failure.hint ?? RECEIVE_HINT
					});
					return;
				}

				const { flow, credential, delivered, error } = (await res.json()) as {
					flow: IssuerFlowSummary;
					credential?: unknown;
					delivered: boolean;
					error?: { message: string };
				};
				if (stopped) return;

				if (!delivered) {
					callbacks.onMiss(
						error?.message ?? 'Your issuer delivered no credential. Check the input and try again.'
					);
					return;
				}

				callbacks.onSettled({
					stepId: step.id,
					artifact: credential,
					issuerFlow: flow,
					transport: { delivered, ...(error ? { error } : {}) }
				});
			} catch (e) {
				if (stopped) return;
				callbacks.onFailed({
					message: e instanceof Error ? e.message : String(e),
					hint: RECEIVE_HINT
				});
			}
		})();
	}

	return {
		receive,
		stop: () => {
			stopped = true;
		}
	};
}

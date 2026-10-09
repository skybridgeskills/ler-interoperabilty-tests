import type {
	IssuerFlowSummary,
	StepEvidence,
	WireTrace
} from '$lib/interop/scenario-run/index.js';
import type { ScenarioAction, ScenarioStep } from '$lib/interop/scenarios/index.js';

import type { RunnerError } from './exchange-step.js';

/** The intake transports a `receive-from-issuer` step may name. */
type ReceiveTransport = Extract<ScenarioAction, { kind: 'receive-from-issuer' }>['transport'];

/** What a miss observed: the wire summary, the trace, and the delivery outcome. */
export type ReceiveMissEvidence = Pick<StepEvidence, 'issuerFlow' | 'trace' | 'transport'>;

export type ReceiveStepCallbacks = {
	/** A credential arrived; the step's evidence is ready for `settleStep`. */
	onSettled: (evidence: StepEvidence) => void;
	/**
	 * Nothing arrived (the issuer refused, or the exchange never delivered) — not
	 * an error. The step stays in-flight so the operator can supply fresh input
	 * and try again.
	 *
	 * The evidence observed on the way to nothing is passed through with the
	 * note. It is **not** scored — the step has not settled, so no requirement
	 * resolves against it — but it is the whole reason the Details panel exists:
	 * a miss is precisely when the operator needs to see what the wire did.
	 */
	onMiss: (note: string, observed: ReceiveMissEvidence) => void;
	/** The receive route failed outright. The run becomes unrecordable — see D2. */
	onFailed: (error: RunnerError) => void;
};

/** The hint shown when the receive route fails outright. Operator "you" only. */
export const RECEIVE_HINT =
	'Check the server logs — the suite engages the issuer with the input you pasted and verifies whatever it delivers.';

/** The miss note shown when nothing arrived and the route named no reason. */
export const RECEIVE_MISS_NOTE =
	'The issuer delivered no credential. Check the input and try again.';

/**
 * The receive field's prompt and placeholder, per intake transport. One field,
 * three pastes: the credential itself, a fresh single-use VC-API interaction
 * URL, or a pre-authorized-code credential offer.
 */
export const RECEIVE_COPY: Record<ReceiveTransport, { prompt: string; placeholder: string }> = {
	direct: {
		prompt: 'Paste the credential the issuer produced',
		placeholder: '{ "@context": […], "type": ["VerifiableCredential", "OpenBadgeCredential"], … }'
	},
	vcalm: {
		prompt: 'Paste a fresh interaction URL from the issuer',
		placeholder: 'https://issuer.example/exchanges/…'
	},
	oid4vci: {
		prompt: 'Paste an openid-credential-offer:// URL from the issuer',
		placeholder: 'openid-credential-offer://?credential_offer_uri=…'
	}
};

/** The confirmation shown once a credential has arrived. */
export const RECEIVE_SETTLED_NOTE =
	'Received the credential from the issuer. Report what it offered below.';

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

				const { flow, credential, delivered, error, trace } = (await res.json()) as {
					flow: IssuerFlowSummary;
					credential?: unknown;
					delivered: boolean;
					error?: { message: string };
					trace?: WireTrace;
				};
				if (stopped) return;

				if (!delivered) {
					callbacks.onMiss(error?.message ?? RECEIVE_MISS_NOTE, {
						issuerFlow: flow,
						...(trace ? { trace } : {}),
						transport: { delivered, ...(error ? { error } : {}) }
					});
					return;
				}

				callbacks.onSettled({
					stepId: step.id,
					artifact: credential,
					issuerFlow: flow,
					...(trace ? { trace } : {}),
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

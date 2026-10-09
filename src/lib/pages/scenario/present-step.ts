import type {
	StepEvidence,
	VerifierPresentResult,
	VerifierRequestSummary,
	WireTrace
} from '$lib/interop/scenario-run/index.js';
import type { ScenarioAction, ScenarioStep } from '$lib/interop/scenarios/index.js';

import type { RunnerError } from './exchange-step.js';

/** The transports a `present-to-verifier` step may name. */
type PresentTransport = Extract<ScenarioAction, { kind: 'present-to-verifier' }>['transport'];

/** What a miss observed: the request floor, the delivery result, and the trace. */
export type PresentMissEvidence = Pick<
	StepEvidence,
	'verifierRequest' | 'verifierPresent' | 'trace'
>;

export type PresentStepCallbacks = {
	/** The credential was submitted; the step's evidence is ready for `settleStep`. */
	onSettled: (evidence: StepEvidence) => void;
	/**
	 * The submission did not land (a transport miss) — not an error. The step
	 * stays in-flight so the operator can paste a fresh URL and re-present.
	 *
	 * The evidence observed on the way is passed through with the note, exactly as
	 * the receive step's miss does: nothing scores against it (the step has not
	 * settled), but it is what the Details panel shows while the operator works
	 * out why the submission bounced.
	 */
	onMiss: (note: string, observed: PresentMissEvidence) => void;
	/** The present route failed outright. The run becomes unrecordable — see D2. */
	onFailed: (error: RunnerError) => void;
};

/** The hint shown when the present route fails outright. Operator "you" only. */
export const PRESENT_HINT =
	'Check the server logs — the suite signs the presentation locally and submits it to the URL you pasted.';

/** The miss note shown when the submission bounced and the route named no reason. */
export const PRESENT_MISS_NOTE =
	'The verifier did not accept the submission. Paste a fresh interaction URL and try again.';

/**
 * The present field's prompt and placeholder, per transport. VCALM takes a
 * fresh single-use interaction URL; OID4VP takes the authorization request in
 * any of its three forms.
 */
export const PRESENT_COPY: Record<PresentTransport, { prompt: string; placeholder: string }> = {
	vcalm: {
		prompt: 'Paste a fresh interaction URL from the verifier',
		placeholder: 'https://verifier.example/interactions/…'
	},
	oid4vp: {
		prompt: 'Paste a presentation request from the verifier',
		placeholder: 'openid4vp://… (or a request_uri URL or the request JSON)'
	}
};

/** The confirmation shown once the credential has been presented. */
export const PRESENT_SETTLED_NOTE = 'Presented to the verifier. Report what it decided below.';

/**
 * Drive a `present-to-verifier` step. Unlike `direct-step` (which the suite
 * starts on its own), this waits for the operator's **run-time input** — the
 * interaction URL their verifier handed them — so it exposes a `present(url)`
 * the paste field calls, rather than running on construction.
 *
 * Each VC-API exchange is single-use, so every `present(url)` is a fresh
 * engagement. A transport miss (`submitted: false`) is not a failure: it calls
 * `onMiss`, the step stays in-flight, and the operator can paste a fresh URL and
 * `present` again. Only the route erroring (or the network) is `onFailed`.
 *
 * Returns a handle whose `stop()` abandons any in-flight request's callbacks.
 */
export function startPresentStep(
	step: ScenarioStep,
	callbacks: PresentStepCallbacks
): { present: (interactionUrl: string) => void; stop: () => void } {
	let stopped = false;

	function present(interactionUrl: string): void {
		const action = step.action;
		if (action?.kind !== 'present-to-verifier') {
			callbacks.onFailed({ message: `Step "${step.id}" is not a present-to-verifier step.` });
			return;
		}

		void (async () => {
			try {
				const res = await fetch('/api/scenario-runner/present', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						credential: action.credential,
						transport: action.transport,
						interactionUrl,
						...(action.tamper ? { tamper: action.tamper } : {}),
						...(action.cryptosuite ? { cryptosuite: action.cryptosuite } : {})
					})
				});
				if (stopped) return;

				if (!res.ok) {
					const failure = (await res.json().catch(() => ({}))) as Partial<RunnerError> & {
						message?: string;
					};
					callbacks.onFailed({
						message: failure.message ?? `Presenting responded ${res.status}`,
						hint: failure.hint ?? PRESENT_HINT
					});
					return;
				}

				const { request, present, trace } = (await res.json()) as {
					request: VerifierRequestSummary;
					present: VerifierPresentResult;
					trace?: WireTrace;
				};
				if (stopped) return;

				if (!present.submitted) {
					callbacks.onMiss(present.error?.message ?? PRESENT_MISS_NOTE, {
						verifierRequest: request,
						verifierPresent: present,
						...(trace ? { trace } : {})
					});
					return;
				}

				// No `artifact`: the presented credential is signed and dropped
				// server-side (holder key never leaves the server), so the request +
				// present summaries plus the trace are the whole of this step's
				// client-side evidence.
				callbacks.onSettled({
					stepId: step.id,
					verifierRequest: request,
					verifierPresent: present,
					...(trace ? { trace } : {})
				});
			} catch (e) {
				if (stopped) return;
				callbacks.onFailed({
					message: e instanceof Error ? e.message : String(e),
					hint: PRESENT_HINT
				});
			}
		})();
	}

	return {
		present,
		stop: () => {
			stopped = true;
		}
	};
}

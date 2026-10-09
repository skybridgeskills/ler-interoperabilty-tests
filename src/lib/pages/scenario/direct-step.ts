import type { StepEvidence } from '$lib/interop/scenario-run/index.js';
import type { ScenarioStep } from '$lib/interop/scenarios/index.js';

import type { RunnerError } from './exchange-step.js';

export type DirectStepCallbacks = {
	/** The signed credential is ready to download and hand to the system under test. */
	onReady: (credential: unknown) => void;
	/** The step settled; its (artifact-only) evidence is ready for `settleStep`. */
	onSettled: (evidence: StepEvidence) => void;
	/** The signing request failed. The run becomes unrecordable — see D2. */
	onFailed: (error: RunnerError) => void;
};

const SIGN_HINT =
	'Check the server logs — the suite signs deliverables locally, no DCC services needed.';

/**
 * Drive a `deliver-direct` step: ask the server to sign one recipe (optionally
 * tampered) and, on success, hand the credential to the panel for download and
 * settle the step.
 *
 * A direct step mints **no exchange** — there is no wire to poll and no
 * interaction URL. Its evidence is the artifact alone (`settleStep` resolves the
 * step's automatic requirements, of which a verifier acceptance pass has none),
 * so the operator can answer as soon as the credential is in hand.
 *
 * Returns a handle whose `stop()` abandons an in-flight request's callbacks.
 */
export function startDirectStep(
	step: ScenarioStep,
	callbacks: DirectStepCallbacks
): { stop: () => void } {
	let stopped = false;

	void (async () => {
		const action = step.action;
		if (action?.kind !== 'deliver-direct') {
			callbacks.onFailed({ message: `Step "${step.id}" is not a direct-delivery step.` });
			return;
		}

		try {
			const res = await fetch('/api/scenario-runner/deliver-direct', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					credential: action.credential,
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
					message: failure.message ?? `Signing responded ${res.status}`,
					hint: failure.hint ?? SIGN_HINT
				});
				return;
			}

			const { credential } = (await res.json()) as { credential: unknown };
			if (stopped) return;
			callbacks.onReady(credential);
			callbacks.onSettled({ stepId: step.id, artifact: credential });
		} catch (e) {
			if (stopped) return;
			callbacks.onFailed({ message: e instanceof Error ? e.message : String(e), hint: SIGN_HINT });
		}
	})();

	return {
		stop: () => {
			stopped = true;
		}
	};
}

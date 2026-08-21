import { recordScenarioRun, scenarioRunFor } from '$lib/client/scenario-runs/index.js';
import {
	answerRequirement,
	type AttestedAnswerValue,
	beginStep,
	failStep,
	recordFromRunState,
	type RequirementOutcome,
	type ScenarioRunRecord,
	type ScenarioRunState,
	settleStep,
	startRun,
	type StepEvidence,
	stepsInRunOrder,
	unansweredRequirements
} from '$lib/interop/scenario-run/index.js';
import type { Scenario, ScenarioStep } from '$lib/interop/scenarios/index.js';

import { startDirectStep } from './direct-step.js';
import {
	attachExchangeStep,
	type RunnerError,
	startExchangeStep,
	type StepLink
} from './exchange-step.js';
import { nowIso } from './now-iso.js';
import { startPresentStep } from './present-step.js';

/**
 * Drives one scenario run: the M3 engine, the exchange lifecycle, and when a
 * run records. Extracted from `ScenarioPage.svelte` so the component stays a
 * template plus wiring — this is the state machine, and it decides nothing
 * about scoring, only sequencing.
 *
 * A factory rather than a class: Svelte 5's `$state` fields on a plain object
 * are reactive the same way, and every consumer already reads this repo's
 * other extracted store this way (`createSelectionStore`).
 */
export function createScenarioRunController(
	getScenario: () => Scenario,
	getAttachExchangeId: () => string | undefined
) {
	// Both are fixed for the page's lifetime — read once here, deferred through a
	// getter so the component's top-level call does not read a `$props` value in a
	// non-reactive position (which svelte-check rightly warns about when it can't
	// tell a fixed capture from a stale one).
	const scenario = getScenario();
	const attachExchangeId = getAttachExchangeId();
	const actionSteps = scenario.steps.filter((s) => s.action);
	/** Attach adopts into step 1, which is only meaningful with exactly one action step — D3. */
	const attachable = attachExchangeId !== undefined && actionSteps.length === 1;

	let current = $state<ScenarioRunState | undefined>(undefined);
	let discovered = $state<ScenarioRunRecord | undefined>(undefined);
	let link = $state<StepLink | undefined>(undefined);
	/** The signed credential of the active `deliver-direct` step, for its download panel. */
	let deliverable = $state<unknown>(undefined);
	let stepError = $state<RunnerError | undefined>(undefined);
	let recorded = $state(false);
	let handle: { stop: () => void } | undefined;
	/** The active `present-to-verifier` driver, kept so the paste field can call it. */
	let presentDriver: { present: (interactionUrl: string) => void; stop: () => void } | undefined;
	/** Paste-field state for the active present step: in-flight, an amber miss note, and a retry. */
	let presentBusy = $state(false);
	let presentNote = $state<string | undefined>(undefined);
	let presentRetry = $state(false);

	const runSteps = $derived(current ? stepsInRunOrder(scenario, current) : scenario.steps);
	const outcomes = $derived<Record<string, RequirementOutcome>>(
		current ? current.outcomes : (discovered?.outcomes ?? {})
	);
	const showingStored = $derived(!current && !!discovered);
	const unanswered = $derived(current ? unansweredRequirements(scenario, current.outcomes) : []);
	const errored = $derived(current?.steps.some((s) => s.state === 'errored') ?? false);

	/**
	 * The step the operator is working on: the first non-pending step that still
	 * has something to answer. A step stays live while its questions are open and
	 * collapses only once they are all answered — which is what walks the spine
	 * down the page.
	 */
	const activeStepId = $derived.by(() => {
		const state = current;
		if (!state) return undefined;
		for (const entry of state.steps) {
			if (entry.state === 'pending' || entry.state === 'errored') continue;
			const step = scenario.steps.find((s) => s.id === entry.stepId);
			if (step?.requirements.some((r) => !state.outcomes[r.id])) return entry.stepId;
		}
		return undefined;
	});

	const engineStateOf = (stepId: string) =>
		current?.steps.find((s) => s.stepId === stepId)?.state ?? 'settled';

	/** Whether this step's questions are answerable — only once the wire has settled. */
	const answerableNow = (stepId: string) =>
		!showingStored && stepId === activeStepId && engineStateOf(stepId) === 'settled';

	/** Adopt a stored result found on mount. The route never reads `localStorage` itself. */
	function discoverStoredRun() {
		discovered = scenarioRunFor(scenario.slug);
		return discovered;
	}

	function begin() {
		handle?.stop();
		handle = undefined;
		link = undefined;
		deliverable = undefined;
		stepError = undefined;
		recorded = false;
		discovered = undefined;
		// `now` and `shuffleSeed` are injected, never read ambiently — the engine
		// is deterministic by design and this is the one place with a clock.
		current = startRun(scenario, {
			now: nowIso(),
			shuffleSeed: crypto.randomUUID()
		});
		advance();
	}

	/** Start the next pending step. One step is driven at a time. */
	function advance() {
		const state = current;
		if (!state) return;
		const next = state.steps.find((s) => s.state === 'pending');
		if (!next) return;
		const step = scenario.steps.find((s) => s.id === next.stepId);
		if (!step) return;

		current = beginStep(state, step.id);
		link = undefined;
		deliverable = undefined;
		handle?.stop();
		handle = undefined;

		// A pure question step has no wire to wait for — it settles at once.
		if (!step.action) {
			settle({ stepId: step.id });
			return;
		}

		// A direct-delivery step mints no exchange: the suite signs a credential
		// the operator downloads and hands to their tool, then answers. It settles
		// as soon as the credential is in hand.
		if (step.action.kind === 'deliver-direct') {
			handle = startDirectStep(step, {
				onReady: (credential) => (deliverable = credential),
				onSettled: (evidence: StepEvidence) => settle(evidence),
				onFailed: (error: RunnerError) => fail(step.id, error)
			});
			return;
		}

		// A present-to-verifier step waits for the operator's run-time input — the
		// interaction URL their verifier handed them. It does not run on its own:
		// the paste field calls `present(url)`, and a transport miss stays in-flight
		// so a fresh URL can be tried. It settles once the credential is submitted.
		if (step.action.kind === 'present-to-verifier') {
			presentBusy = false;
			presentNote = undefined;
			presentRetry = false;
			presentDriver = startPresentStep(step, {
				onSettled: (evidence: StepEvidence) => settle(evidence),
				onMiss: (note: string) => {
					presentBusy = false;
					presentRetry = true;
					presentNote = note;
				},
				onFailed: (error: RunnerError) => fail(step.id, error)
			});
			handle = presentDriver;
			return;
		}

		const callbacks = {
			onLink: (l: StepLink) => (link = l),
			onSettled: (evidence: StepEvidence) => settle(evidence),
			onFailed: (error: RunnerError) => fail(step.id, error)
		};
		handle =
			attachable && attachExchangeId
				? attachExchangeStep(scenario, step, attachExchangeId, callbacks)
				: startExchangeStep(scenario, step, callbacks);
	}

	/** `settleStep` resolves the step's automatic requirements immediately — M3's contract. */
	function settle(evidence: StepEvidence) {
		const state = current;
		if (!state) return;
		handle?.stop();
		handle = undefined;
		presentDriver = undefined;
		current = settleStep(scenario, state, evidence.stepId, evidence);
		advanceIfAnswered();
	}

	function fail(stepId: string, error: RunnerError) {
		const state = current;
		if (!state) return;
		handle?.stop();
		handle = undefined;
		stepError = error;
		current = failStep(state, stepId);
	}

	function answer(requirementId: string, value: AttestedAnswerValue) {
		const state = current;
		if (!state) return;
		current = answerRequirement(scenario, state, requirementId, value);
		advanceIfAnswered();
	}

	/** Present the active `present-to-verifier` step with the operator's pasted URL. */
	function present(interactionUrl: string) {
		if (!presentDriver || presentBusy) return;
		presentBusy = true;
		presentNote = undefined;
		presentDriver.present(interactionUrl);
	}

	/** Move on only once the live step has nothing left to ask. */
	function advanceIfAnswered() {
		if (!current || errored) return;
		if (activeStepId === undefined) advance();
	}

	/** Records once, and only with every requirement answered — D1. */
	function finish() {
		const state = current;
		if (!state || recorded || unanswered.length > 0 || errored) return;
		recordScenarioRun(recordFromRunState(scenario, state, nowIso()));
		recorded = true;
	}

	function destroy() {
		handle?.stop();
		handle = undefined;
	}

	const labelFor = (step: ScenarioStep, index: number) =>
		step.shuffle === true ? `${scenario.shuffleLabel ?? 'Step'} ${index + 1}` : step.title;

	return {
		get hasActiveRun() {
			return current !== undefined;
		},
		get link() {
			return link;
		},
		get deliverable() {
			return deliverable;
		},
		get stepError() {
			return stepError;
		},
		get recorded() {
			return recorded;
		},
		get discovered() {
			return discovered;
		},
		get runSteps() {
			return runSteps;
		},
		get outcomes() {
			return outcomes;
		},
		get showingStored() {
			return showingStored;
		},
		get unanswered() {
			return unanswered;
		},
		get errored() {
			return errored;
		},
		get activeStepId() {
			return activeStepId;
		},
		get attachable() {
			return attachable;
		},
		get presentBusy() {
			return presentBusy;
		},
		get presentNote() {
			return presentNote;
		},
		get presentRetry() {
			return presentRetry;
		},
		engineStateOf,
		answerableNow,
		labelFor,
		discoverStoredRun,
		begin,
		answer,
		present,
		finish,
		destroy
	};
}

export type ScenarioRunController = ReturnType<typeof createScenarioRunController>;

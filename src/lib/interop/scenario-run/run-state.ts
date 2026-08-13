import {
	type Requirement,
	type Scenario,
	scenarioFingerprint,
	type ScenarioStep
} from '$lib/interop/scenarios/index.js';

import {
	emptyEvidence,
	type RunEvidence,
	type StepEvidence,
	withStepEvidence
} from './evidence.js';
import type { AttestedAnswerValue, RequirementOutcome } from './requirement-outcome.js';
import { resolveAutomaticRequirement, scoreAttestedAnswer } from './score-answer.js';
import { shuffleSteps } from './shuffle.js';

/** Where one step is in its lifecycle. */
export type StepState = 'pending' | 'in-flight' | 'settled' | 'errored';

/**
 * A run in progress: the steps in **run order**, the evidence gathered so far,
 * and every requirement outcome settled so far.
 *
 * Plain data — every transition below returns a new state rather than mutating.
 * The caller (a page) holds it; nothing here touches storage or the DOM.
 */
export type ScenarioRunState = {
	scenarioSlug: string;
	/** Denormalised at start, so a run scores against the definition it began with. */
	fingerprint: string;
	/**
	 * Steps in RUN order — already shuffled. **Never re-derive this from the
	 * definition**; doing so would re-order a run mid-flight and hand the
	 * operator the answer key.
	 */
	steps: { stepId: string; state: StepState }[];
	evidence: RunEvidence;
	answers: Record<string, AttestedAnswerValue>;
	outcomes: Record<string, RequirementOutcome>;
	attemptStartedAt: string;
};

/**
 * Begin a run. The shuffle happens exactly once, here.
 *
 * `now` and `shuffleSeed` are **injected, never read ambiently** — the repo has
 * a `TimeService` and an `IdService` for this, and the engine has to be
 * deterministic under test.
 *
 * A retry is simply this function called again: fresh exchange, fresh fixture,
 * fresh seed, every requirement answered anew. There is no answer editing and no
 * answer-locking machinery, because re-answering after a reveal tests nothing —
 * the question is "did your tool tell you?", and you have just been told.
 */
export function startRun(
	scenario: Scenario,
	{ now, shuffleSeed }: { now: string; shuffleSeed: string }
): ScenarioRunState {
	return {
		scenarioSlug: scenario.slug,
		fingerprint: scenarioFingerprint(scenario),
		steps: shuffleSteps(scenario.steps, shuffleSeed).map((step) => ({
			stepId: step.id,
			state: 'pending' as StepState
		})),
		evidence: emptyEvidence(),
		answers: {},
		outcomes: {},
		attemptStartedAt: now
	};
}

/** Mark a step as running. */
export function beginStep(state: ScenarioRunState, stepId: string): ScenarioRunState {
	return withStepState(state, stepId, 'in-flight');
}

/**
 * Settle a step: record its evidence, then **resolve every automatic requirement
 * on it immediately**.
 *
 * That ordering is not cosmetic. Automatic requirements are the wire truth, and
 * showing "delivery completed ✓" while asking "so was it stored?" is the best
 * teaching moment the suite has. The operator must see what the wire said before
 * being asked what they saw.
 */
export function settleStep(
	scenario: Scenario,
	state: ScenarioRunState,
	stepId: string,
	evidence: StepEvidence
): ScenarioRunState {
	const nextEvidence = withStepEvidence(state.evidence, evidence);
	const step = stepOf(scenario, stepId);

	const resolved: Record<string, RequirementOutcome> = {};
	for (const requirement of step.requirements) {
		if (requirement.check.kind !== 'automatic') continue;
		resolved[requirement.id] = resolveAutomaticRequirement(requirement, stepId, nextEvidence);
	}

	return {
		...withStepState(state, stepId, 'settled'),
		evidence: nextEvidence,
		outcomes: { ...state.outcomes, ...resolved }
	};
}

/**
 * A step that could not run at all — the harness failed, not the wallet.
 *
 * Its automatic requirements are left unresolved rather than failed: we did not
 * observe them, and recording a failure we did not measure is the dishonesty
 * this whole design is built to avoid. The run stays `incomplete`.
 */
export function failStep(state: ScenarioRunState, stepId: string): ScenarioRunState {
	return withStepState(state, stepId, 'errored');
}

/**
 * Record an operator's answer and score it.
 *
 * **A wrong answer does not stop the run.** The operator keeps answering and
 * still learns; there is no score to protect.
 */
export function answerRequirement(
	scenario: Scenario,
	state: ScenarioRunState,
	requirementId: string,
	answer: AttestedAnswerValue
): ScenarioRunState {
	const requirement = requirementOf(scenario, requirementId);
	return {
		...state,
		answers: { ...state.answers, [requirementId]: answer },
		outcomes: { ...state.outcomes, [requirementId]: scoreAttestedAnswer(requirement, answer) }
	};
}

/** The scenario's steps in this run's order — what a page renders down the page. */
export function stepsInRunOrder(scenario: Scenario, state: ScenarioRunState): ScenarioStep[] {
	return state.steps.map(({ stepId }) => stepOf(scenario, stepId));
}

/** The step a run is currently working through, if any. */
export function currentStepId(state: ScenarioRunState): string | undefined {
	return state.steps.find((s) => s.state === 'in-flight')?.stepId;
}

function withStepState(state: ScenarioRunState, stepId: string, next: StepState): ScenarioRunState {
	if (!state.steps.some((s) => s.stepId === stepId)) {
		throw new Error(`Step "${stepId}" is not part of this run.`);
	}
	return {
		...state,
		steps: state.steps.map((s) => (s.stepId === stepId ? { ...s, state: next } : s))
	};
}

function stepOf(scenario: Scenario, stepId: string): ScenarioStep {
	const step = scenario.steps.find((s) => s.id === stepId);
	if (!step) throw new Error(`Scenario "${scenario.slug}" has no step "${stepId}".`);
	return step;
}

function requirementOf(scenario: Scenario, requirementId: string): Requirement {
	for (const step of scenario.steps) {
		const requirement = step.requirements.find((r) => r.id === requirementId);
		if (requirement) return requirement;
	}
	throw new Error(`Scenario "${scenario.slug}" has no requirement "${requirementId}".`);
}

import type { Scenario } from '$lib/interop/scenarios/index.js';

import type { RequirementOutcome } from './requirement-outcome.js';

/** How a whole scenario settled. */
export type ScenarioStatus = 'passed' | 'failed' | 'incomplete';

/**
 * Roll a run's requirement outcomes up to a scenario status.
 *
 * - Any requirement still unanswered → **`incomplete`**. So `incomplete` means
 *   only "not answered yet" — never "we could not decide". A `cant-tell` answer
 *   is answered, and it fails.
 * - Any failing **MUST** → `failed`.
 * - A failing **SHOULD** is recorded and shown but does not block → `passed`.
 *
 * The unanswered check comes first: a run with one failing MUST and three
 * unanswered requirements is not yet a verdict, it is a run in progress.
 */
export function rollUpScenario(
	scenario: Scenario,
	outcomes: Record<string, RequirementOutcome>
): ScenarioStatus {
	const requirements = requirementsOf(scenario);

	if (requirements.some((r) => !outcomes[r.id])) return 'incomplete';
	if (
		requirements.some((r) => outcomes[r.id].level === 'MUST' && outcomes[r.id].status === 'fail')
	) {
		return 'failed';
	}
	return 'passed';
}

/** Every requirement in a scenario, in step-then-requirement order. */
export function requirementsOf(scenario: Scenario) {
	return scenario.steps.flatMap((step) => step.requirements);
}

/** Requirements with no outcome yet — what the operator still has to answer. */
export function unansweredRequirements(
	scenario: Scenario,
	outcomes: Record<string, RequirementOutcome>
) {
	return requirementsOf(scenario).filter((r) => !outcomes[r.id]);
}

/**
 * Failing SHOULDs, which are shown but never block. Surfaced separately so the
 * UI can say "passed, with two advisories" rather than flattening them away.
 */
export function failingShoulds(
	scenario: Scenario,
	outcomes: Record<string, RequirementOutcome>
): RequirementOutcome[] {
	return requirementsOf(scenario)
		.map((r) => outcomes[r.id])
		.filter((o): o is RequirementOutcome => !!o && o.level === 'SHOULD' && o.status === 'fail');
}

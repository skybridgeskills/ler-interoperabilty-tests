import { z } from 'zod';

import { type Scenario, ScenarioSlug } from '$lib/interop/scenarios/index.js';
import { ZodFactory } from '$lib/util/zod-factory.js';

import { RequirementOutcome } from './requirement-outcome.js';
import { rollUpScenario } from './roll-up.js';
import type { ScenarioRunState } from './run-state.js';

/**
 * The persisted result of running a scenario.
 *
 * **One record per scenario — the latest — plus an `attempts` counter.** Nothing
 * in the UI wants more. Holding history costs one schema bump later (the store's
 * value type becomes an array; this record travels unchanged) and is priced as
 * affordable. **Do not pre-build the array.**
 *
 * `fingerprint` is denormalised from the definition the run scored against. On
 * read, a record whose fingerprint no longer matches the live scenario is
 * **dropped** — the row reverts to "not run". No stale state, and no "outdated,
 * must re-run" UI.
 *
 * Each outcome carries the raw answer, the expected answer and the derived
 * status. Denormalising the expected answer is what lets a stored run render its
 * reveal without the live definition.
 */
export const ScenarioRunRecord = ZodFactory(
	z.object({
		scenarioSlug: ScenarioSlug.schema,
		ranAt: z.string().default(() => new Date().toISOString()),
		fingerprint: z.string().min(1),
		status: z.enum(['passed', 'failed', 'incomplete']),
		outcomes: z.record(z.string(), RequirementOutcome.schema),
		/** How many times this scenario has been run. The store owns incrementing it. */
		attempts: z.number().int().min(1).default(1)
	})
);
export type ScenarioRunRecord = ReturnType<typeof ScenarioRunRecord>;

/**
 * Turn a finished run into the record the store persists.
 *
 * `attempts` is deliberately not a parameter: the store reads the previous
 * record and increments, so no caller can get the count wrong.
 */
export function recordFromRunState(
	scenario: Scenario,
	state: ScenarioRunState,
	ranAt: string
): ScenarioRunRecord {
	return ScenarioRunRecord({
		scenarioSlug: state.scenarioSlug,
		ranAt,
		fingerprint: state.fingerprint,
		status: rollUpScenario(scenario, state.outcomes),
		outcomes: state.outcomes
	});
}

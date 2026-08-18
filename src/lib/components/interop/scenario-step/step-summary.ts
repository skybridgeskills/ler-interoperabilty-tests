import type { RequirementOutcome } from '$lib/interop/scenario-run/index.js';
import type { Requirement } from '$lib/interop/scenarios/index.js';

import type { Verdict } from './outcome-tone.js';

/** How a settled step reads when collapsed: a verdict and a count. */
export type StepSummary = { verdict: Verdict; passed: number; total: number; label: string };

const VERDICT_SUMMARY: Record<Verdict, string> = {
	correct: 'Correct',
	wrong: 'Missed',
	'cant-tell': 'Couldn’t tell'
};

/**
 * Summarise a settled step from its requirements' outcomes.
 *
 * The worst thing that happened wins, and `cant-tell` is not the worst: a step
 * where the operator got one wrong reads as *Missed* even if another was a
 * `can't tell`, because a wrong answer is the sharper finding. A step whose
 * only blemish is `can't tell` says so, which is the distinction the amber tone
 * exists to preserve.
 *
 * An unresolved requirement — an errored step's automatic checks — simply does
 * not count as passed. It is never counted as failed: we did not measure it.
 */
export function summariseStep(
	requirements: Requirement[],
	outcomes: Record<string, RequirementOutcome>
): StepSummary {
	const settled = requirements
		.map((r) => outcomes[r.id])
		.filter((o): o is RequirementOutcome => !!o);
	const passed = settled.filter((o) => o.status === 'pass').length;
	const failedOutright = settled.some((o) => o.status === 'fail' && o.answer?.kind !== 'cant-tell');
	const couldNotTell = settled.some((o) => o.answer?.kind === 'cant-tell');

	const verdict: Verdict = failedOutright ? 'wrong' : couldNotTell ? 'cant-tell' : 'correct';
	return {
		verdict,
		passed,
		total: requirements.length,
		label: `${VERDICT_SUMMARY[verdict]} · ${passed} of ${requirements.length}`
	};
}

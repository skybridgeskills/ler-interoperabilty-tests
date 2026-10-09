import type { AttestedAnswerValue, RequirementOutcome } from '$lib/interop/scenario-run/index.js';
import type { AttestedAnswer } from '$lib/interop/scenarios/index.js';

/**
 * The three honest verdicts a reveal can carry. Not two: `cant-tell` is a
 * failure *and* a distinct thing to look at, because "my wallet gave me nothing
 * to judge by" is precisely the legibility failure a scenario measures.
 */
export type Verdict = 'correct' | 'wrong' | 'cant-tell';

/** Tailwind classes for one verdict. See `docs/design-system.md` § outcome tones. */
export type ToneClasses = { dot: string; text: string; edge: string; soft: string };

export const VERDICT_TONE: Record<Verdict, ToneClasses> = {
	correct: {
		dot: 'bg-result-pass',
		text: 'text-result-pass',
		edge: 'border-result-pass-border',
		soft: 'bg-result-pass-soft'
	},
	wrong: {
		dot: 'bg-result-fail',
		text: 'text-result-fail',
		edge: 'border-result-fail-border',
		soft: 'bg-result-fail-soft'
	},
	'cant-tell': {
		dot: 'bg-warning',
		text: 'text-warning',
		edge: 'border-warning-border',
		soft: 'bg-warning-soft'
	}
};

/**
 * The verdict word. `cant-tell` gets a sentence rather than a label because the
 * whole point is to say the thing the amber is there to soften.
 */
export const VERDICT_WORD: Record<Verdict, string> = {
	correct: 'Correct',
	wrong: 'Not what happened',
	'cant-tell': 'That’s a finding, not a mistake'
};

/**
 * Which verdict an outcome carries.
 *
 * Read off the outcome alone — never re-derived from the live definition — so a
 * stored run renders the same reveal it rendered the day it was recorded.
 */
export function verdictOf(outcome: RequirementOutcome): Verdict {
	if (outcome.answer?.kind === 'cant-tell') return 'cant-tell';
	return outcome.status === 'pass' ? 'correct' : 'wrong';
}

/** Tone classes for an automatic pass/fail, which has no verdict of its own. */
export function statusTone(status: 'pass' | 'fail'): ToneClasses {
	return VERDICT_TONE[status === 'pass' ? 'correct' : 'wrong'];
}

/**
 * Human-readable form of an answer value, for the reveal's sentences.
 *
 * `choose` values are looked up in the question's options when it is available,
 * and fall back to the raw value otherwise — a stored record whose scenario has
 * since dropped an option still says something true rather than nothing.
 */
export function answerLabel(value: AttestedAnswerValue, answer?: AttestedAnswer): string {
	if (value.kind === 'cant-tell') return 'I couldn’t tell';
	if (value.kind === 'affirm') return value.value ? 'Yes' : 'No';
	const option =
		answer?.kind === 'choose' ? answer.options.find((o) => o.value === value.value) : undefined;
	return option?.label ?? value.value;
}

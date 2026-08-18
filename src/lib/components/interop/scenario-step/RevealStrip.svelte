<script lang="ts">
	import type { RequirementOutcome } from '$lib/interop/scenario-run/index.js';
	import type { AttestedAnswer } from '$lib/interop/scenarios/index.js';

	import { answerLabel, VERDICT_TONE, VERDICT_WORD, verdictOf } from './outcome-tone.js';

	/**
	 * The reveal: what the operator answered, what actually happened, and why the
	 * two differ. This is the whole point of the page — a scenario that only said
	 * "wrong" would teach nothing.
	 *
	 * Purely presentational, and driven **entirely by the outcome**. The
	 * denormalised `answer` and `expected` are what let a stored run re-render
	 * its reveal without the live catalog; nothing here reaches for the
	 * definition to decide anything, only to look up an option's display label.
	 *
	 * `can't tell` renders amber rather than red. It fails, and it must look like
	 * it failed — but it is the honest answer and has to be distinguishable at a
	 * glance from getting it wrong. See `docs/design-system.md` § outcome tones.
	 */
	let {
		outcome,
		statement,
		answer
	}: {
		outcome: RequirementOutcome;
		/** The requirement's statement — the truth itself, for an `affirm` question. */
		statement: string;
		/** The question as authored, so a `choose` value renders as its label. */
		answer?: AttestedAnswer;
	} = $props();

	const verdict = $derived(verdictOf(outcome));
	const tone = $derived(VERDICT_TONE[verdict]);
	const chosen = $derived(outcome.answer ? answerLabel(outcome.answer, answer) : undefined);

	/**
	 * What actually happened, in the operator's words rather than the schema's.
	 *
	 * An `affirm` question is authored so `true` is always expected, which makes
	 * its expected *value* useless to render — "What actually happened: Yes" says
	 * nothing. The statement is the truth, so that is what is shown.
	 */
	const truth = $derived.by(() => {
		if (!outcome.expected) return undefined;
		return outcome.expected.kind === 'affirm' ? statement : answerLabel(outcome.expected, answer);
	});

	/**
	 * Why the answer landed where it did.
	 *
	 * `detail` is preferred when the engine set one — a failed automatic check's
	 * reason, or the `can't tell` finding. Otherwise this is derived from the
	 * outcome, deliberately generically: the scenario schema carries no per-
	 * requirement reveal copy, and adding one was ruled out for this milestone.
	 */
	const explanation = $derived.by(() => {
		if (outcome.detail) return outcome.detail;
		if (verdict === 'correct') return 'That is what your wallet did.';
		return 'That is not what your wallet did.';
	});
</script>

<div class={`space-y-1 rounded-sm border-l-2 ${tone.edge} ${tone.soft} px-3 py-2`}>
	<p class={`text-label-md font-medium ${tone.text}`}>{VERDICT_WORD[verdict]}</p>
	<p class="text-body-md text-foreground">
		{#if chosen}You answered <em>{chosen}</em>.{/if}
		{explanation}
	</p>
	{#if verdict !== 'correct' && truth}
		<p class="text-body-md text-muted-foreground">
			What actually happened: <span class="text-foreground">{truth}</span>
		</p>
	{/if}
</div>

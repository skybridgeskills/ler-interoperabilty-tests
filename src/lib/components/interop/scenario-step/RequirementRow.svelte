<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import type { AttestedAnswerValue, RequirementOutcome } from '$lib/interop/scenario-run/index.js';
	import type { Requirement } from '$lib/interop/scenarios/index.js';

	import AnswerPrompt from './AnswerPrompt.svelte';
	import { statusTone, VERDICT_TONE, verdictOf } from './outcome-tone.js';
	import RevealStrip from './RevealStrip.svelte';

	/**
	 * One requirement, in whichever state the run has left it.
	 *
	 * | State | Renders |
	 * | --- | --- |
	 * | pending | a dimmed line — the step has not been reached |
	 * | automatic, resolved | tone dot, level badge, statement, PASS/FAIL, and where it came from |
	 * | automatic, unresolved | the same row, muted, waiting on the wire |
	 * | attested, unanswered | the statement and an {@link AnswerPrompt} |
	 * | attested, answered | the statement, the ATTESTED pill, and a {@link RevealStrip} |
	 *
	 * Purely presentational: it takes an outcome, it never scores one. The layout
	 * follows `RequirementStatusRow` — dot, level badge, text, trailing label —
	 * deliberately matching its visual language without importing it, because
	 * that component takes the checklist-era `RequirementStatus` shape which is
	 * removed at M13.
	 */
	let {
		requirement,
		outcome,
		pending = false,
		onAnswer
	}: {
		requirement: Requirement;
		outcome?: RequirementOutcome;
		/** The step has not been reached yet. */
		pending?: boolean;
		/** Omitted when the row is read-only — a stored run, or another step. */
		onAnswer?: (value: AttestedAnswerValue) => void;
	} = $props();

	const attested = $derived(requirement.check.kind === 'attested');
	const question = $derived(
		requirement.check.kind === 'attested' ? requirement.check.answer : undefined
	);
	const levelClass = $derived(
		requirement.level === 'MUST'
			? 'border-transparent bg-requirement text-requirement-foreground'
			: 'border-requirement-border bg-requirement-soft text-requirement'
	);
	const tone = $derived(
		outcome
			? outcome.source === 'attested'
				? VERDICT_TONE[verdictOf(outcome)]
				: statusTone(outcome.status)
			: undefined
	);
</script>

{#if pending}
	<div class="flex items-start gap-3 opacity-60">
		<span aria-hidden="true" class="mt-1.5 size-3 shrink-0 rounded-full bg-border"></span>
		<span class="min-w-0 flex-1 text-body-md text-muted-foreground">{requirement.statement}</span>
	</div>
{:else}
	<div class="flex items-start gap-3">
		<span
			aria-hidden="true"
			class={`mt-1.5 size-3 shrink-0 rounded-full ${tone ? tone.dot : 'bg-muted-foreground/40'}`}
		></span>
		<div class="min-w-0 flex-1 space-y-1">
			<!--
				Below `sm:` the statement drops to its own full-width line so the
				trailing pill cannot squeeze it; at `sm:` and up it is one inline row.
			-->
			<div class="flex flex-wrap items-baseline gap-x-2 gap-y-1 sm:flex-nowrap">
				<Badge variant="requirement" class={levelClass}>{requirement.level}</Badge>
				<span
					class="order-last w-full text-body-md text-foreground sm:order-none sm:w-auto sm:min-w-0 sm:flex-1"
				>
					{requirement.statement}
				</span>
				{#if attested}
					<span
						class="ml-auto shrink-0 rounded-full border border-live-border bg-live-soft px-1.5 py-0.5 text-label-md font-medium whitespace-nowrap text-live sm:ml-0"
					>
						Attested
					</span>
				{:else}
					<span
						class={`ml-auto shrink-0 text-label-md font-medium whitespace-nowrap sm:ml-0 ${tone ? tone.text : 'text-muted-foreground'}`}
					>
						{outcome ? (outcome.status === 'pass' ? 'Pass' : 'Fail') : 'Waiting'}
					</span>
				{/if}
			</div>

			{#if !attested}
				<p class="text-body-md text-muted-foreground">From the wire — checked automatically.</p>
				{#if outcome?.detail}
					<p class="text-body-md text-muted-foreground">{outcome.detail}</p>
				{/if}
			{:else if outcome}
				<RevealStrip {outcome} statement={requirement.statement} answer={question} />
			{:else if onAnswer && question}
				<AnswerPrompt answer={question} {onAnswer} />
			{/if}
		</div>
	</div>
{/if}

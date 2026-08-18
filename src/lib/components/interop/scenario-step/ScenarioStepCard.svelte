<script lang="ts">
	import type { Snippet } from 'svelte';

	import type { AttestedAnswerValue, RequirementOutcome } from '$lib/interop/scenario-run/index.js';
	import type { StepState } from '$lib/interop/scenario-run/index.js';
	import type { Requirement } from '$lib/interop/scenarios/index.js';

	import { VERDICT_TONE } from './outcome-tone.js';
	import RequirementRow from './RequirementRow.svelte';
	import { summariseStep } from './step-summary.js';

	/**
	 * One step of the spine: the collapsing shell around a setup callout, an
	 * optional action, and the step's requirement rows.
	 *
	 * Collapsing is what makes a multi-step scenario usable on a phone — a
	 * three-step run measured ~22% shorter than an open spine at 375px, and the
	 * gap widens with step count. A settled step stays reopenable; nothing is
	 * hidden, only folded.
	 *
	 * **The label is resolved by the caller.** A shuffled step's authored title
	 * is an answer key, so this component is never handed the whole step to pick
	 * from — that is how the leak would get reintroduced.
	 *
	 * **The setup callout is always visible** on a live or settled step. An
	 * operator who does not know they were handed a tampered credential reads
	 * "nothing was stored" as a broken harness. Only the *expected answer* is
	 * concealed.
	 */
	let {
		index,
		label,
		state,
		setup,
		requirements,
		outcomes,
		onAnswer,
		action,
		error
	}: {
		/** 1-based position in RUN order. */
		index: number;
		/** Already resolved: `shuffleLabel + position` for a shuffled step, else its title. */
		label: string;
		state: StepState;
		/** What this step is about to do, in plain language. Never concealed. */
		setup: string;
		requirements: Requirement[];
		outcomes: Record<string, RequirementOutcome>;
		/** Omitted when the step is read-only — a stored run, or not the live step. */
		onAnswer?: (requirementId: string, value: AttestedAnswerValue) => void;
		/** The step's action surface — an exchange runner panel, usually. */
		action?: Snippet;
		/** What went wrong, when the harness could not run this step at all. */
		error?: string;
	} = $props();

	const summary = $derived(summariseStep(requirements, outcomes));
	const tone = $derived(VERDICT_TONE[summary.verdict]);
</script>

{#snippet setupCallout()}
	<div class="rounded-sm border-l-2 border-requirement-border bg-requirement-soft px-3 py-2">
		<p class="text-label-md font-medium text-requirement">What we are sending</p>
		<p class="mt-1 text-body-md text-foreground">{setup}</p>
	</div>
{/snippet}

{#snippet rows(readOnly: boolean)}
	{#each requirements as requirement (requirement.id)}
		<RequirementRow
			{requirement}
			outcome={outcomes[requirement.id]}
			onAnswer={readOnly || !onAnswer ? undefined : (value) => onAnswer(requirement.id, value)}
		/>
	{/each}
{/snippet}

{#if state === 'pending'}
	<li class="rounded-md border border-border bg-card">
		<div class="flex flex-wrap items-center gap-2 p-3 opacity-60">
			<span aria-hidden="true" class="size-3 shrink-0 rounded-full bg-border"></span>
			<span class="text-label-md font-mono text-muted-foreground">{index}.</span>
			<span class="text-body-md text-muted-foreground">{label}</span>
			<span class="ml-auto text-label-md text-muted-foreground">Waiting</span>
		</div>
	</li>
{:else if state === 'settled'}
	<li class="rounded-md border border-border bg-card">
		<details class="group">
			<summary class="flex cursor-pointer flex-wrap items-center gap-2 p-3 hover:bg-muted/40">
				<span aria-hidden="true" class={`size-3 shrink-0 rounded-full ${tone.dot}`}></span>
				<span class="text-label-md font-mono text-muted-foreground">{index}.</span>
				<span class="text-body-md text-foreground">{label}</span>
				<span class={`ml-auto text-label-md ${tone.text}`}>{summary.label}</span>
				<span
					aria-hidden="true"
					class="text-muted-foreground transition-transform group-open:rotate-90"
				>
					›
				</span>
			</summary>
			<div class="space-y-4 border-t border-border p-4">
				{@render setupCallout()}
				{@render rows(true)}
			</div>
		</details>
	</li>
{:else if state === 'errored'}
	<li class="rounded-md border border-result-fail-border bg-card">
		<div class="space-y-4 p-4">
			<header class="flex flex-wrap items-center gap-2">
				<span aria-hidden="true" class="size-3 shrink-0 rounded-full bg-result-fail"></span>
				<span class="text-label-md font-mono text-muted-foreground">{index}.</span>
				<h2 class="text-title-lg text-foreground">{label}</h2>
				<span class="ml-auto text-label-md text-result-fail">Failed to run</span>
			</header>
			{@render setupCallout()}
			<div class="rounded-sm border-l-2 border-result-fail-border bg-result-fail-soft px-3 py-2">
				<p class="text-label-md font-medium text-result-fail">
					The harness could not run this step
				</p>
				{#if error}
					<p class="mt-1 text-body-md text-foreground">{error}</p>
				{/if}
			</div>
			{@render rows(true)}
		</div>
	</li>
{:else}
	<li class="rounded-md border border-live-border bg-card">
		<div class="space-y-4 p-4">
			<header class="flex flex-wrap items-center gap-2">
				<span aria-hidden="true" class="size-3 shrink-0 animate-pulse rounded-full bg-live"></span>
				<span class="text-label-md font-mono text-muted-foreground">{index}.</span>
				<h2 class="text-title-lg text-foreground">{label}</h2>
				<span class="ml-auto text-label-md text-live">In flight</span>
			</header>
			{@render setupCallout()}
			{#if action}{@render action()}{/if}
			{@render rows(false)}
		</div>
	</li>
{/if}

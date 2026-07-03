<script lang="ts">
	import type { Snippet } from 'svelte';

	import { Badge } from '$lib/components/ui/badge/index.js';
	import {
		additiveProfileHref,
		type AdditiveProfile,
		type AdditiveProfileSlug,
		type ChecklistStep,
		type WorkflowChecklist as WorkflowChecklistData
	} from '$lib/interop/index.js';

	/**
	 * One additive's combined-view section, rendered as a collapsible block:
	 * collapsed by default, auto-expanded when the additive is selected for
	 * testing, with an inline select/deselect toggle. Presentation-only and
	 * caller-driven — the owner passes `selected` and `onToggle` (the shared
	 * selection store on real pages), so this component is reused unchanged by
	 * both the static combined view and the runnable pages.
	 */
	let {
		additive,
		checklist,
		baseProfileName,
		selected,
		onToggle,
		stepList
	}: {
		additive: AdditiveProfile;
		checklist: WorkflowChecklistData;
		/** Base profile name, for the "layer on top of {base}" copy. */
		baseProfileName: string;
		/** Whether this additive is currently selected for testing. */
		selected: boolean;
		onToggle: (slug: AdditiveProfileSlug) => void;
		/** Optional shared step renderer; falls back to an inline list. */
		stepList?: Snippet<[ChecklistStep[], 'h2' | 'h3']>;
	} = $props();

	// Collapsed by default; auto-expands when selected. A writable `$derived`
	// re-syncs whenever `selected` changes (selecting expands, deselecting
	// collapses) while `bind:open` still lets the user manually toggle in
	// between.
	let open = $derived(selected);

	function toggleSelected(event: MouseEvent) {
		// Keep the select control from also toggling the <details> when it lives
		// inside the <summary>.
		event.preventDefault();
		event.stopPropagation();
		onToggle(additive.slug);
	}
</script>

<details bind:open class="group mt-16 space-y-4 border-t border-border pt-10">
	<summary class="cursor-pointer list-none">
		<div class="flex flex-wrap items-center gap-3">
			<span
				aria-hidden="true"
				class="text-muted-foreground transition-transform group-open:rotate-90"
			>
				›
			</span>
			<Badge variant="outline" href={additiveProfileHref(additive.slug)}>Additive</Badge>
			<a
				class="text-headline-md hover:text-primary hover:underline"
				href={additiveProfileHref(additive.slug)}
			>
				{additive.name}
			</a>
			<button
				type="button"
				aria-pressed={selected}
				onclick={toggleSelected}
				class={`ml-auto flex items-center gap-2 rounded-md border px-3 py-1.5 text-label-md transition ${
					selected
						? 'border-primary bg-primary/10 text-foreground'
						: 'border-border bg-card text-muted-foreground hover:border-primary/60'
				}`}
			>
				<span
					aria-hidden="true"
					class={`flex size-4 shrink-0 items-center justify-center rounded-full border text-xs ${
						selected
							? 'border-primary bg-primary text-primary-foreground'
							: 'border-border text-transparent'
					}`}
				>
					✓
				</span>
				{selected ? 'Selected for testing' : 'Select for testing'}
			</button>
		</div>
		<p class="max-w-prose pl-6 text-body-md text-muted-foreground">
			These requirements layer on top of the {baseProfileName} checklist when the {additive.name} additive
			is in use.
		</p>
	</summary>

	<div class="mt-4">
		{#if stepList}
			{@render stepList(checklist.steps, 'h3')}
		{:else}
			<ol class="space-y-10">
				{#each checklist.steps as step, i (step.title)}
					<li class="space-y-3">
						<header class="flex items-baseline gap-3">
							<span class="text-headline-md font-mono text-primary">{i + 1}.</span>
							<h3 class="text-headline-md">{step.title}</h3>
						</header>
						<p class="max-w-prose text-body-md text-muted-foreground">{step.summary}</p>
					</li>
				{/each}
			</ol>
		{/if}
	</div>
</details>

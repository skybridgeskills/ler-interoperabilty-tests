<script lang="ts">
	import type { FilterPanelItem } from './filter-panel-item.js';

	/**
	 * The full-width panel one filter dimension opens.
	 *
	 * It is the home of the educational content the homepage used to carry
	 * inline: the dimension's own explanation, a card per item with its blurb and
	 * a link to that item's page, the builder/evaluator framing, and a link to the
	 * dimension's overview page. The cards are **also** the toggles, so a reader
	 * who came here to understand the dimension never has to close the
	 * explanation to act on it.
	 *
	 * Purely presentational: selection state and every href arrive as props.
	 */
	let {
		heading,
		description,
		items,
		columns = 3,
		builderNote,
		evaluatorNote,
		overviewHref,
		overviewLabel,
		footnote,
		onToggle,
		onClose
	}: {
		heading: string;
		description: string;
		items: FilterPanelItem[];
		/** Card grid width at `sm:` and up. One column below it, always. */
		columns?: 2 | 3;
		builderNote: string;
		evaluatorNote: string;
		overviewHref: string;
		overviewLabel: string;
		/** Optional line under the grid, e.g. "2 more add-ons apply to other roles." */
		footnote?: string;
		onToggle: (slug: string) => void;
		onClose: () => void;
	} = $props();
</script>

<div class="space-y-4">
	<button
		type="button"
		onclick={onClose}
		aria-label="Close"
		class="absolute top-3 right-4 text-label-md text-muted-foreground hover:text-foreground"
	>
		✕
	</button>

	<div class="flex flex-col gap-2 pr-8 sm:flex-row sm:items-baseline sm:justify-between">
		<h3 class="text-title-lg text-foreground">{heading}</h3>
		<p class="max-w-prose text-body-md text-muted-foreground">{description}</p>
	</div>

	<div class={`grid gap-3 ${columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
		{#each items as item (item.slug)}
			<button
				type="button"
				role="switch"
				aria-checked={item.selected}
				onclick={() => onToggle(item.slug)}
				class={`flex h-full flex-col gap-2 rounded-md border p-4 text-left transition ${
					item.selected
						? 'border-primary bg-primary/10'
						: 'border-border bg-background hover:border-primary/60'
				}`}
			>
				<span class="flex w-full items-start justify-between gap-2">
					<span class="text-title-lg text-foreground">{item.title}</span>
					<span
						aria-hidden="true"
						class={`flex size-5 shrink-0 items-center justify-center rounded-full border text-xs ${
							item.selected
								? 'border-primary bg-primary text-primary-foreground'
								: 'border-border text-transparent'
						}`}
					>
						✓
					</span>
				</span>
				{#if item.meta}
					<span class="text-label-md text-muted-foreground">{item.meta}</span>
				{/if}
				<!--
					Clamped: the panel teaches, but a 14-line cryptosuite blurb would make
					the panel the page. The item's own link carries the rest.
				-->
				<span class="line-clamp-4 flex-1 text-body-md text-muted-foreground">{item.body}</span>
				<!--
					The docs link sits inside the toggle, so its click must not also flip
					the switch it is nested in.
				-->
				<a
					href={item.docHref}
					onclick={(event) => event.stopPropagation()}
					class="text-label-md text-primary hover:underline"
				>
					{item.docLabel} →
				</a>
			</button>
		{/each}
	</div>

	{#if footnote}
		<p class="text-label-md text-muted-foreground">{footnote}</p>
	{/if}

	<div class="mt-5 flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-start">
		<div class="flex-1 space-y-1">
			<span class="text-label-md text-muted-foreground">For builders</span>
			<p class="text-body-md text-foreground">{builderNote}</p>
		</div>
		<div class="flex-1 space-y-1">
			<span class="text-label-md text-muted-foreground">For evaluators</span>
			<p class="text-body-md text-foreground">{evaluatorNote}</p>
		</div>
		<a
			href={overviewHref}
			class="shrink-0 self-start text-label-md text-primary hover:underline sm:self-end"
		>
			{overviewLabel} →
		</a>
	</div>
</div>

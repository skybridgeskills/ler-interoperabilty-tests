<script lang="ts">
	import XIcon from '@lucide/svelte/icons/x';

	import { perspectiveOption } from '$lib/components/perspective/index.js';
	import type { Perspective } from '$lib/interop/perspective/index.js';

	import type { ToneClasses } from './filter-bar-tone.js';
	import type { FilterPanelItem } from './filter-panel-item.js';

	/**
	 * The full-width panel one filter dimension opens.
	 *
	 * It is the home of the educational content the homepage used to carry
	 * inline: the dimension's own explanation, a card per item with its blurb and
	 * a link to that item's page, a note for the reader's Perspective, and a link to the
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
		note,
		noteTag,
		overviewHref,
		overviewLabel,
		footnote,
		onToggle,
		onClose,
		tone
	}: {
		heading: string;
		description: string;
		items: FilterPanelItem[];
		/** Card grid width at `sm:` and up. One column below it, always. */
		columns?: 2 | 3;
		/** The footer note, already resolved for the reader's Perspective. */
		note: string;
		/** The Perspective the note was written for; absent (no tag) when unset. */
		noteTag?: Perspective;
		overviewHref: string;
		overviewLabel: string;
		/** Optional line under the grid, e.g. "2 more add-ons apply to other roles." */
		footnote?: string;
		onToggle: (slug: string) => void;
		onClose: () => void;
		/**
		 * The open dimension's colour, as complete class strings. The tone marks the
		 * requirement layer the dimension selects within — blue for base-profile
		 * requirements, teal for the add-on layer — so the panel, the trigger that
		 * opened it, and the card sections further down the page all agree.
		 */
		tone: ToneClasses;
	} = $props();

	const tag = $derived(noteTag ? perspectiveOption(noteTag) : undefined);
</script>

<div class="space-y-4">
	<!--
		40 × 40. The glyph this replaced measured 7.8 × 16.8px against WCAG 2.2 §2.5.8's
		24 × 24 minimum, and it is the largest close in the codebase on purpose: this is
		a full-bleed mega menu, not a dialog. Its hover is tinted in the tone of the
		dimension it closes, so it belongs to the panel rather than floating over it.
	-->
	<button
		type="button"
		onclick={onClose}
		aria-label="Close"
		class={`absolute top-2.5 right-3 flex size-10 items-center justify-center rounded-full text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${tone.softHover}`}
	>
		<XIcon aria-hidden="true" class="size-5" />
	</button>

	<!--
		The soft band gives the panel an identity where the heading would otherwise
		float: the single-column phone layout. Above `sm:` the panel stays genuinely
		quiet, which is the whole point of this treatment — and the notch's inner fill
		in `FilterBar.svelte` switches at the same breakpoint, so the two must agree.
	-->
	<div class={`-mx-4 -mt-6 mb-4 px-4 pt-6 pb-4 sm:bg-transparent ${tone.softBg}`}>
		<div class="flex flex-col gap-2 pr-14 sm:flex-row sm:items-baseline sm:justify-between">
			<h3 class={`text-title-lg ${tone.text}`}>{heading}</h3>
			<p class="max-w-prose text-body-md text-muted-foreground">{description}</p>
		</div>
	</div>

	<div class={`grid gap-3 ${columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
		{#each items as item (item.slug)}
			<button
				type="button"
				role="switch"
				aria-checked={item.selected}
				onclick={() => onToggle(item.slug)}
				class={`flex h-full flex-col gap-2 rounded-md border p-4 text-left transition ${
					item.selected ? tone.selectedCard : `border-border bg-background ${tone.cardHover}`
				}`}
			>
				<span class="flex w-full items-start justify-between gap-2">
					<span class="text-title-lg text-foreground">{item.title}</span>
					<span
						aria-hidden="true"
						class={`flex size-5 shrink-0 items-center justify-center rounded-full border text-xs ${
							item.selected ? tone.pip : 'border-border text-transparent'
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
				{#if item.example}
					<span
						class="border-t border-dashed border-border pt-2 text-body-md text-muted-foreground italic"
					>
						{item.example}
					</span>
				{/if}
				<!--
					The docs link sits inside the toggle, so its click must not also flip
					the switch it is nested in.
				-->
				<a
					href={item.docHref}
					onclick={(event) => event.stopPropagation()}
					class={`text-label-md hover:underline ${tone.text}`}
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
			{#if tag}
				<span class="inline-flex items-center gap-1 text-label-md text-perspective">
					<tag.icon class="size-3.5" aria-hidden="true" />
					{tag.noun}
				</span>
			{/if}
			<p class="text-body-md text-foreground">{note}</p>
		</div>
		<a
			href={overviewHref}
			class={`shrink-0 self-start text-label-md hover:underline sm:self-end ${tone.text}`}
		>
			{overviewLabel} →
		</a>
	</div>
</div>

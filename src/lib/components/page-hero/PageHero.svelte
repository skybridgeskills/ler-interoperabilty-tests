<script lang="ts">
	import type { Snippet } from 'svelte';

	import { PerspectiveChip, PerspectiveSwitch } from '$lib/components/perspective/index.js';
	import type { Perspective } from '$lib/interop/perspective/index.js';

	/**
	 * The one page hero. **Two sizes:** `large` is Home only — centred, the full
	 * bloom, a bottom feather that settles into the filter bar, and the
	 * Perspective switch rendered by the hero itself before the page's own
	 * actions. `compact` is every other page — left-aligned, blooms pushed into
	 * the corners, a crisp edge, and the Perspective chip rendered **first in the
	 * chips row** whether or not the page passes chips of its own.
	 *
	 * Prop-driven, never location-aware: the page reads the Perspective store and
	 * passes `perspective` + `onPerspectiveChange`, so Storybook can render every
	 * state. Every slot except `title` is optional; mobile scales the same two
	 * sizes down and hides nothing.
	 */
	let {
		size = 'compact',
		perspective,
		onPerspectiveChange,
		breadcrumb,
		eyebrow,
		title,
		status,
		lede,
		chips,
		meta,
		actions
	}: {
		size?: 'large' | 'compact';
		/** The reader's Perspective, if chosen. */
		perspective: Perspective | undefined;
		onPerspectiveChange: (perspective: Perspective) => void;
		/** The path back — inline links and separators. Compact only. */
		breadcrumb?: Snippet;
		/** The page type in small caps: Scenario, Standard Profile, Add-on, Badge, Role, About. */
		eyebrow?: Snippet;
		/** The `h1`'s content. */
		title: Snippet;
		/** A pill right of the title; the title wraps beside it. */
		status?: Snippet;
		/** One muted paragraph's inline content. */
		lede?: Snippet;
		/** Context chips, after the automatic Perspective chip. Compact only. */
		chips?: Snippet;
		/** One quiet line of facts and outward links. */
		meta?: Snippet;
		/** Buttons. On `large`, after the Perspective switch. */
		actions?: Snippet;
	} = $props();

	const large = $derived(size === 'large');
</script>

<section
	class={[
		'relative overflow-hidden',
		large
			? 'rounded-3xl px-[18px] pt-10 pb-9 text-center bg-hero-field @xl:px-8 @xl:pt-16 @xl:pb-14'
			: 'rounded-2xl px-4 pt-[18px] pb-5 bg-hero-field-compact @xl:px-7 @xl:pt-6 @xl:pb-[26px]'
	]}
>
	{#if breadcrumb && !large}
		<nav aria-label="Breadcrumb" class="mb-2.5 text-label-md text-muted-foreground">
			{@render breadcrumb()}
		</nav>
	{/if}

	<div class={large ? 'space-y-3' : 'flex items-start justify-between gap-3'}>
		<div class="min-w-0">
			{#if eyebrow}
				<p class="mb-1.5 text-label-md text-muted-foreground">{@render eyebrow()}</p>
			{/if}
			<h1
				class={large
					? 'mx-auto max-w-4xl font-mono text-[1.75rem]/[1.15] font-bold tracking-tight text-balance @xl:text-display-lg'
					: 'font-mono text-2xl/tight font-semibold tracking-tight text-pretty @xl:text-[2rem]/[1.15]'}
			>
				{@render title()}
			</h1>
		</div>
		{#if status}
			<div class="shrink-0 pt-1">{@render status()}</div>
		{/if}
	</div>

	{#if lede}
		<p
			class={[
				'max-w-prose text-muted-foreground',
				large ? 'mx-auto mt-3.5 text-base' : 'mt-3 text-body-md'
			]}
		>
			{@render lede()}
		</p>
	{/if}

	{#if !large}
		<div class="mt-3.5 flex flex-wrap items-center gap-1.5">
			<PerspectiveChip {perspective} onChange={onPerspectiveChange} />
			{@render chips?.()}
		</div>
	{/if}

	{#if meta}
		<div
			class={[
				'mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-label-md text-muted-foreground',
				large && 'justify-center'
			]}
		>
			{@render meta()}
		</div>
	{/if}

	{#if large}
		<div
			class="mt-6 flex flex-col items-center gap-3 @xl:flex-row @xl:flex-wrap @xl:justify-center"
		>
			<PerspectiveSwitch {perspective} onChange={onPerspectiveChange} />
			{@render actions?.()}
		</div>
		<!-- The feather: settles the large field into the page instead of ending on an edge. -->
		<div
			class="pointer-events-none absolute inset-x-0 bottom-0 h-7 bg-linear-to-b from-transparent to-background print:hidden"
			aria-hidden="true"
		></div>
	{:else if actions}
		<div class="mt-3.5 flex flex-wrap items-center gap-2.5">{@render actions()}</div>
	{/if}
</section>

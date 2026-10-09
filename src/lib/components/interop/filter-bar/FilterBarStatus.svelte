<script lang="ts">
	import Link from '@lucide/svelte/icons/link';

	import { setsLabel } from './filter-bar-summary.js';

	/**
	 * The right end of the filter bar: the count ("All N" unfiltered, "n of N"
	 * filtered), then — once anything is selected — Copy link and Clear. The copy
	 * confirmation is announced politely and says what the link carries: the
	 * filter, not the reader's Perspective.
	 */
	let {
		matched,
		total,
		anySelected,
		copyLabel,
		onCopyLink,
		onClear
	}: {
		matched: number;
		total: number;
		anySelected: boolean;
		/** Already resolved for the reader's Perspective. */
		copyLabel: string;
		onCopyLink: () => Promise<void>;
		onClear: () => void;
	} = $props();

	let copied = $state(false);

	async function copy(): Promise<void> {
		await onCopyLink();
		copied = true;
		setTimeout(() => (copied = false), 4000);
	}
</script>

<div class="flex flex-wrap items-center gap-3 px-2 pt-1 sm:ml-auto sm:pt-0">
	<span class="mr-auto text-label-md text-muted-foreground sm:mr-0">
		{#if !anySelected}
			All {setsLabel(total)}
		{:else}
			<span class="text-foreground">{matched}</span> of {setsLabel(total)}
		{/if}
	</span>
	{#if anySelected}
		<button
			type="button"
			onclick={copy}
			class="inline-flex items-center gap-1 text-label-md text-primary hover:underline"
		>
			<Link class="size-3.5" aria-hidden="true" />
			{copyLabel}
		</button>
		<button type="button" onclick={onClear} class="text-label-md text-primary hover:underline">
			Clear
		</button>
	{/if}
	<p aria-live="polite" class="w-full text-right text-label-md text-muted-foreground empty:hidden">
		{#if copied}Link copied — it opens with this filter, not your Perspective.{/if}
	</p>
</div>

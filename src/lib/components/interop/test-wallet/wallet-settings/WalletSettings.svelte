<script lang="ts">
	import SlidersIcon from '@lucide/svelte/icons/sliders-horizontal';
	import type { Snippet } from 'svelte';

	/**
	 * A visually-separated, secondary section holding wallet settings (e.g. holder
	 * cryptosuite / DID type) rendered via the `settings` snippet. Renders nothing when
	 * no snippet is passed — the paste variant simply omits settings.
	 */
	let { title = 'Wallet settings', settings }: { title?: string; settings?: Snippet } = $props();
</script>

{#if settings}
	<section class="space-y-3 border-t border-live-border/60 pt-4">
		<p class="inline-flex items-center gap-1.5 text-label-md text-muted-foreground uppercase">
			<SlidersIcon aria-hidden="true" class="size-3.5" />
			{title}
		</p>
		<div class="space-y-3">
			{@render settings()}
		</div>
	</section>
{/if}

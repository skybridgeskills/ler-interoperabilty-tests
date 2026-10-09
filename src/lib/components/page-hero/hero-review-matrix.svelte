<script lang="ts">
	import type { Snippet } from 'svelte';

	import type { Perspective } from '$lib/interop/perspective/index.js';
	import { ResponsivePreview } from '$lib/storybook/index.js';

	import HeroReviewCell from './hero-review-cell.svelte';

	/**
	 * Storybook harness for the responsive review: one hero at phone, tablet and
	 * desktop widths. The hero responds to its container (`@xl:`), so each preview
	 * box is a real width. The theme is Storybook's own (`localStorage.theme`, as
	 * the app's toggle sets it) — the light tokens live on `:root`, so a wrapper
	 * cannot force light inside a dark page. Every cell's controls are live.
	 */
	let {
		perspective,
		hero
	}: {
		perspective?: Perspective;
		hero: Snippet<[Perspective | undefined, (perspective: Perspective) => void]>;
	} = $props();

	const widths = [
		{ width: 375, fluid: false, label: 'Phone (375px)' },
		{ width: 768, fluid: false, label: 'Tablet (768px)' },
		{ width: 1024, fluid: true, label: 'Desktop (≥1024px)' }
	];
</script>

<div class="space-y-6">
	{#each widths as w (w.label)}
		<ResponsivePreview width={w.width} fluid={w.fluid} label={w.label}>
			<div class="bg-background p-4">
				<HeroReviewCell initial={perspective} {hero} />
			</div>
		</ResponsivePreview>
	{/each}
</div>

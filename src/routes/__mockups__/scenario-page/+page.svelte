<!--
	Temporary UX exploration. Delete after production implementation.

	Not linked from anywhere in the app. Reachable only at
	/__mockups__/scenario-page while the M5 design is being chosen.
-->
<script lang="ts">
	import ChosenDirection from '$lib/pages/__mockups__/scenario-page/ChosenDirection.svelte';
	import RevealGallery from '$lib/pages/__mockups__/scenario-page/RevealGallery.svelte';
	import StepSpineMockup from '$lib/pages/__mockups__/scenario-page/StepSpineMockup.svelte';

	const VIEWS = [
		{ id: 'chosen-mid', label: '★ Chosen — mid-run' },
		{ id: 'chosen-done', label: '★ Chosen — finished' },
		{ id: 'chosen-blocked', label: '★ Chosen — blocked' },
		{ id: 'reveal', label: 'Reveal — 4 concepts × 3 outcomes' },
		{ id: 'reveal-phone', label: 'Reveal — phone' },
		{ id: 'spine-open', label: 'Spine 1 — open (desktop)' },
		{ id: 'spine-collapsing', label: 'Spine 2 — collapsing (desktop)' },
		{ id: 'spine-open-phone', label: 'Spine 1 — open (phone)' },
		{ id: 'spine-collapsing-phone', label: 'Spine 2 — collapsing (phone)' }
	] as const;

	let view = $state<(typeof VIEWS)[number]['id']>('chosen-mid');
</script>

<div class="min-h-screen bg-background">
	<nav
		class="sticky top-0 z-10 flex flex-wrap gap-2 border-b border-border bg-card/95 p-3 backdrop-blur"
	>
		<span class="self-center pr-2 text-label-md text-muted-foreground uppercase">UX explore</span>
		{#each VIEWS as v (v.id)}
			<button
				type="button"
				onclick={() => (view = v.id)}
				class={`rounded-sm border px-2 py-1 text-label-md ${
					view === v.id
						? 'border-primary bg-primary/10 text-primary'
						: 'border-border text-muted-foreground hover:text-foreground'
				}`}
			>
				{v.label}
			</button>
		{/each}
	</nav>

	{#if view === 'chosen-mid'}
		<div class="mx-auto max-w-3xl p-4 sm:p-8"><ChosenDirection show="midRun" /></div>
	{:else if view === 'chosen-done'}
		<div class="mx-auto max-w-3xl p-4 sm:p-8"><ChosenDirection show="finished" /></div>
	{:else if view === 'chosen-blocked'}
		<div class="mx-auto max-w-3xl p-4 sm:p-8"><ChosenDirection show="blocked" /></div>
	{:else if view === 'reveal'}
		<RevealGallery show="gallery" />
	{:else if view === 'reveal-phone'}
		<RevealGallery show="phone" />
	{:else if view === 'spine-open'}
		<StepSpineMockup show="openDesktop" />
	{:else if view === 'spine-collapsing'}
		<StepSpineMockup show="collapsingDesktop" />
	{:else if view === 'spine-open-phone'}
		<StepSpineMockup show="openPhone" />
	{:else if view === 'spine-collapsing-phone'}
		<StepSpineMockup show="collapsingPhone" />
	{/if}
</div>

<script lang="ts">
	import type { AdditiveProfile, AdditiveProfileSlug } from '$lib/interop/index.js';

	/**
	 * Interactive multi-select for additive profiles. State is owned by the
	 * caller; each additive renders as an accessible on/off toggle. Additive
	 * profiles layer extra requirements on top of one or more base profiles.
	 */
	let {
		profiles,
		selected,
		onToggle,
		heading = 'Additive profiles',
		description = 'Additive profiles layer extra requirements on top of one or more base profiles. Select the ones your ecosystem requires.'
	}: {
		profiles: AdditiveProfile[];
		selected: Set<AdditiveProfileSlug>;
		onToggle: (slug: AdditiveProfileSlug) => void;
		heading?: string;
		description?: string;
	} = $props();
</script>

<section class="space-y-4">
	<header class="space-y-2">
		<h2 class="text-headline-md">{heading}</h2>
		{#if description}
			<p class="max-w-prose text-body-md text-muted-foreground">{description}</p>
		{/if}
	</header>

	<div class="grid gap-3 sm:grid-cols-2">
		{#each profiles as profile (profile.slug)}
			{@const isOn = selected.has(profile.slug)}
			<button
				type="button"
				aria-pressed={isOn}
				onclick={() => onToggle(profile.slug)}
				class={`flex h-full flex-col gap-1 rounded-md border p-4 text-left transition ${
					isOn
						? 'border-primary bg-primary/10 text-foreground'
						: 'border-border bg-card text-muted-foreground hover:border-primary/60'
				}`}
			>
				<span class="flex items-center justify-between gap-2">
					<span class="text-title-lg text-foreground">{profile.name}</span>
					<span
						aria-hidden="true"
						class={`flex size-5 shrink-0 items-center justify-center rounded-full border text-xs ${
							isOn
								? 'border-primary bg-primary text-primary-foreground'
								: 'border-border text-transparent'
						}`}
					>
						✓
					</span>
				</span>
				<span class="line-clamp-3 text-body-md text-muted-foreground">{profile.description}</span>
			</button>
		{/each}
	</div>
</section>

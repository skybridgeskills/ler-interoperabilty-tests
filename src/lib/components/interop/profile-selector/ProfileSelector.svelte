<script lang="ts">
	import type { Profile, ProfileSlug } from '$lib/interop/index.js';

	import { AudienceNote } from '../audience-note/index.js';

	/**
	 * Interactive multi-select for interoperability profiles. State is owned by
	 * the caller; each profile renders as an accessible on/off toggle. A profile
	 * is a set of standards + options covering everything needed to do one thing
	 * with credentials.
	 */
	let {
		profiles,
		selected,
		onToggle,
		heading = 'Interoperability profiles',
		description = 'A profile is a set of standards and options — every parameter you need to do one thing with credentials. Which profiles do you want to cover?',
		builderNote,
		buyerNote
	}: {
		profiles: Profile[];
		selected: Set<ProfileSlug>;
		onToggle: (slug: ProfileSlug) => void;
		heading?: string;
		description?: string;
		builderNote?: string;
		buyerNote?: string;
	} = $props();
</script>

<section class="space-y-4">
	<header class="space-y-2">
		<h2 class="text-headline-md">{heading}</h2>
		{#if description}
			<p class="max-w-prose text-body-md text-muted-foreground">{description}</p>
		{/if}
	</header>

	{#if builderNote && buyerNote}
		<AudienceNote builder={builderNote} buyer={buyerNote} />
	{/if}

	<div class="grid gap-3 sm:grid-cols-3">
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

<script lang="ts">
	import type { Role, RoleSlug } from '$lib/interop/index.js';

	import { AudienceNote } from '../audience-note/index.js';

	/**
	 * Interactive multi-select for roles. State is owned by the caller; this
	 * component renders each role as an accessible on/off toggle. The role
	 * label stays "Wallet" — "holder" only appears in descriptive copy.
	 */
	let {
		roles,
		selected,
		onToggle,
		heading = 'Pick your role',
		description,
		builderNote,
		evaluatorNote
	}: {
		roles: Role[];
		selected: Set<RoleSlug>;
		onToggle: (slug: RoleSlug) => void;
		heading?: string;
		description?: string;
		builderNote?: string;
		evaluatorNote?: string;
	} = $props();
</script>

<section class="space-y-4">
	<header class="space-y-2">
		<h2 class="text-headline-md">{heading}</h2>
		{#if description}
			<p class="max-w-prose text-body-md text-muted-foreground">{description}</p>
		{/if}
	</header>

	{#if builderNote && evaluatorNote}
		<AudienceNote builder={builderNote} evaluator={evaluatorNote} />
	{/if}

	<div class="grid gap-3 sm:grid-cols-3">
		{#each roles as role (role.slug)}
			{@const isOn = selected.has(role.slug)}
			<button
				type="button"
				aria-pressed={isOn}
				onclick={() => onToggle(role.slug)}
				class={`flex h-full flex-col gap-1 rounded-md border p-4 text-left transition ${
					isOn
						? 'border-primary bg-primary/10 text-foreground'
						: 'border-border bg-card text-muted-foreground hover:border-primary/60'
				}`}
			>
				<span class="flex items-center justify-between gap-2">
					<span class="text-title-lg text-foreground">{role.plural}</span>
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
				<span class="text-body-md text-muted-foreground">{role.blurb}</span>
			</button>
		{/each}
	</div>
</section>

<script lang="ts">
	import type { Profile } from '$lib/interop/index.js';

	/**
	 * A Standard Profile's body: its key components and use cases. The identity
	 * facts — version, status, last updated, the published-profile link — live in
	 * the page hero's `meta` line, not here.
	 */
	let { profile }: { profile: Profile } = $props();
</script>

<section class="mt-8 max-w-3xl space-y-3">
	<h2 class="text-headline-md">Key components</h2>
	<dl class="space-y-3 text-body-md">
		{#each profile.keyComponents as component (component.label)}
			<div class="flex flex-col">
				<dt class="text-label-md text-muted-foreground">{component.label}</dt>
				<dd class="text-foreground">{component.value}</dd>
			</div>
		{/each}
	</dl>
</section>

{#if profile.useCases.length}
	<section class="mt-12 space-y-4">
		<h2 class="text-headline-md">Use cases</h2>
		<ul class="list-disc space-y-1 pl-6 text-body-md text-muted-foreground">
			{#each profile.useCases as useCase (useCase)}
				<li>{useCase}</li>
			{/each}
		</ul>
	</section>
{/if}

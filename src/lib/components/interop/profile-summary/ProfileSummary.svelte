<script lang="ts">
	import { BuiltOn } from '$lib/components/interop/built-on/index.js';
	import type { Profile } from '$lib/interop/index.js';

	/**
	 * A Standard Profile's body: its key components beside the standards it is
	 * built on, then its use cases. The identity facts — version, status, last
	 * updated, the published-profile link — live in the page hero's `meta` line.
	 * Key components stay unlinked prose: several have no clean spec to point at.
	 */
	let { profile }: { profile: Profile } = $props();
</script>

<div class="mt-8 grid gap-10 md:grid-cols-3">
	<section class="space-y-3 md:col-span-2">
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
	<BuiltOn standards={profile.standards} />
</div>

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

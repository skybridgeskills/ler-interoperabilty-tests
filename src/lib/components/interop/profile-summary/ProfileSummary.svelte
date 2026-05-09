<script lang="ts">
	import type { Profile } from '$lib/interop/index.js';

	let { profile }: { profile: Profile } = $props();
</script>

<section class="mt-8 grid gap-8 md:grid-cols-3">
	<dl class="space-y-2 text-body-md md:col-span-1">
		<div class="flex flex-col">
			<dt class="text-label-md text-muted-foreground">Profile ID</dt>
			<dd class="font-mono text-foreground">{profile.id}</dd>
		</div>
		<div class="flex flex-col">
			<dt class="text-label-md text-muted-foreground">Version</dt>
			<dd class="font-mono text-foreground">{profile.version}</dd>
		</div>
		<div class="flex flex-col">
			<dt class="text-label-md text-muted-foreground">Status</dt>
			<dd class="text-foreground">{profile.status}</dd>
		</div>
		<div class="flex flex-col">
			<dt class="text-label-md text-muted-foreground">Last updated</dt>
			<dd class="text-foreground">{profile.lastUpdated}</dd>
		</div>
	</dl>

	<dl class="space-y-3 text-body-md md:col-span-2">
		<h2 class="text-headline-md">Key components</h2>
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

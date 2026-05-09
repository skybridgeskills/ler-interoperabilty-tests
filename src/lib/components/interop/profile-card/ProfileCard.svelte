<script lang="ts">
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import { profileHref, type Profile } from '$lib/interop/index.js';

	let { profile }: { profile: Profile } = $props();

	const headlineComponents = $derived(profile.keyComponents.slice(0, 3));
</script>

<a class="block transition" href={profileHref(profile.slug)}>
	<Card class="h-full transition hover:border-primary">
		<CardHeader>
			<CardTitle>{profile.name}</CardTitle>
			<CardDescription>{profile.description}</CardDescription>
		</CardHeader>
		<CardContent>
			<dl class="space-y-2 text-body-md">
				{#each headlineComponents as component (component.label)}
					<div class="flex flex-col">
						<dt class="text-label-md text-muted-foreground">{component.label}</dt>
						<dd class="text-foreground">{component.value}</dd>
					</div>
				{/each}
			</dl>
			<p class="mt-4 text-label-md text-primary">View profile →</p>
		</CardContent>
	</Card>
</a>

<script lang="ts">
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import { additiveProfileHref, profileBySlug, type AdditiveProfile } from '$lib/interop/index.js';

	let { profile }: { profile: AdditiveProfile } = $props();

	const baseProfileNames = $derived(
		profile.appliesToBaseProfiles.map((slug) => profileBySlug(slug)?.name ?? slug).join(', ')
	);
</script>

<a class="block transition" href={additiveProfileHref(profile.slug)}>
	<Card class="h-full transition hover:border-primary">
		<CardHeader>
			<CardTitle>{profile.name}</CardTitle>
			<CardDescription>{profile.description}</CardDescription>
		</CardHeader>
		<CardContent>
			<dl class="space-y-2 text-body-md">
				<div class="flex flex-col">
					<dt class="text-label-md text-muted-foreground">Applies to</dt>
					<dd class="text-foreground">{baseProfileNames}</dd>
				</div>
				<div class="flex flex-col">
					<dt class="text-label-md text-muted-foreground">Status</dt>
					<dd class="text-foreground">{profile.status} · v{profile.version}</dd>
				</div>
			</dl>
			<p class="mt-4 text-label-md text-primary">View additive profile →</p>
		</CardContent>
	</Card>
</a>

<script lang="ts">
	import { ProfileCard } from '$lib/components/interop/profile-card/index.js';
	import { allProfiles } from '$lib/interop/index.js';
</script>

<section class="space-y-4">
	<h1 class="text-display-lg">Interoperability profiles</h1>
	<p class="max-w-prose text-body-md text-muted-foreground">
		Each profile bundles a specific combination of credential format, exchange protocol, and
		cryptographic suite into a complete end-to-end set of interoperable workflows.
	</p>
</section>

<section class="mt-12 grid gap-6 md:grid-cols-3">
	{#each allProfiles as profile (profile.slug)}
		<ProfileCard {profile} />
	{/each}
</section>

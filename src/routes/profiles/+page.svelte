<script lang="ts">
	import { AdditiveProfileCard } from '$lib/components/interop/additive-profile-card/index.js';
	import { ProfileCard } from '$lib/components/interop/profile-card/index.js';
	import { allAdditiveProfiles, allProfiles } from '$lib/interop/index.js';
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

{#if allAdditiveProfiles.length > 0}
	<section class="mt-16 space-y-4">
		<h2 class="text-display-md">Additive profiles</h2>
		<p class="max-w-prose text-body-md text-muted-foreground">
			Additive profiles layer extra requirements and credential-payload data on top of one or more
			base profiles. They are not run standalone.
		</p>
	</section>

	<section class="mt-6 grid gap-6 md:grid-cols-3">
		{#each allAdditiveProfiles as profile (profile.slug)}
			<AdditiveProfileCard {profile} />
		{/each}
	</section>
{/if}

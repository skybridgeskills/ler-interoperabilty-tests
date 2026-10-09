<script lang="ts">
	import { AdditiveProfileCard } from '$lib/components/interop/additive-profile-card/index.js';
	import { ProfileCard } from '$lib/components/interop/profile-card/index.js';
	import { allAdditiveProfiles, allProfiles } from '$lib/interop/index.js';
</script>

<section class="space-y-4">
	<h1 class="text-display-lg">Standard Profiles</h1>
	<p class="max-w-prose text-body-md text-muted-foreground">
		A Standard Profile is an interoperability profile: a fixed set of standards and options that two
		products must share to work together. Each one bundles a credential format, an exchange protocol
		and a cryptographic suite into a complete set of workflows.
	</p>
</section>

<section class="mt-12 grid gap-6 md:grid-cols-3">
	{#each allProfiles as profile (profile.slug)}
		<ProfileCard {profile} />
	{/each}
</section>

{#if allAdditiveProfiles.length > 0}
	<section class="mt-16 space-y-4">
		<h2 class="text-display-md">Add-ons</h2>
		<p class="max-w-prose text-body-md text-muted-foreground">
			An add-on layers extra requirements, such as skills data or a pinned cryptosuite, onto a
			Standard Profile. It never runs alone.
		</p>
	</section>

	<section class="mt-6 grid gap-6 md:grid-cols-3">
		{#each allAdditiveProfiles as profile (profile.slug)}
			<AdditiveProfileCard {profile} />
		{/each}
	</section>
{/if}

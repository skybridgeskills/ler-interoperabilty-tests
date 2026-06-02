<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { allAdditiveProfiles } from '$lib/interop/index.js';

	import { AdditiveProfileCard } from './index.js';

	const { Story } = defineMeta({
		title: 'Interop/AdditiveProfileCard',
		component: AdditiveProfileCard
	});
</script>

<Story name="All additive profiles" asChild>
	<div class="grid max-w-5xl gap-6 bg-background p-6 md:grid-cols-3">
		{#each allAdditiveProfiles as profile (profile.slug)}
			<AdditiveProfileCard {profile} />
		{/each}
	</div>
</Story>

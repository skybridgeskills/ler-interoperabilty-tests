<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { allProfiles } from '$lib/interop/index.js';

	import { ProfileCard } from './index.js';

	const { Story } = defineMeta({
		title: 'Interop/ProfileCard',
		component: ProfileCard,
		args: { profile: allProfiles[0] }
	});
</script>

<Story name="All profiles">
	<div class="grid max-w-5xl gap-6 bg-background p-6 md:grid-cols-3">
		{#each allProfiles as profile (profile.slug)}
			<ProfileCard {profile} />
		{/each}
	</div>
</Story>

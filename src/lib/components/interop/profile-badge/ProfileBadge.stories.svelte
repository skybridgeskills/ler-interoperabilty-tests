<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { allProfiles } from '$lib/interop/index.js';

	import { ProfileBadge } from './index.js';

	const { Story } = defineMeta({
		title: 'Interop/ProfileBadge',
		component: ProfileBadge
	});
</script>

<Story name="All profiles" asChild>
	<div class="flex flex-wrap items-center gap-3 bg-background p-6">
		{#each allProfiles as profile (profile.slug)}
			<ProfileBadge {profile} href="/profiles/{profile.slug}" />
		{/each}
	</div>
</Story>

<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { profileBySlug } from '$lib/interop/index.js';

	import { ProfileSummary } from './index.js';

	const vcalm = profileBySlug('vcalm')!;

	const { Story } = defineMeta({
		title: 'Interop/ProfileSummary',
		component: ProfileSummary
	});
</script>

<Story name="VCALM" asChild>
	<div class="bg-background p-6">
		<ProfileSummary profile={vcalm} />
	</div>
</Story>

<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { WithPerspective } from '$lib/storybook/index.js';

	import AboutPage from './AboutPage.svelte';

	const { Story } = defineMeta({
		title: 'Pages/AboutPage',
		component: AboutPage
	});
</script>

<Story name="Default" asChild>
	<div class="min-h-screen bg-background p-12">
		<AboutPage />
	</div>
</Story>

<Story name="Builder chosen" asChild>
	<WithPerspective perspective="builder">
		<div class="min-h-screen bg-background p-12">
			<AboutPage />
		</div>
	</WithPerspective>
</Story>

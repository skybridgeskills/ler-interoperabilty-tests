<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

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

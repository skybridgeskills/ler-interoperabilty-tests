<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import LandingPage from './LandingPage.svelte';

	const { Story } = defineMeta({
		title: 'Pages/LandingPage',
		component: LandingPage
	});
</script>

<Story name="Default" asChild>
	<div class="min-h-screen bg-background p-12">
		<LandingPage />
	</div>
</Story>

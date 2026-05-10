<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { AppHeader } from './index.js';

	const { Story } = defineMeta({
		title: 'Components/AppHeader',
		component: AppHeader
	});
</script>

<Story name="Default" asChild>
	<AppHeader />
</Story>

<Story name="With scrollable body" asChild>
	<AppHeader />
	<main class="mx-auto max-w-7xl px-4 py-12">
		{#each Array.from({ length: 30 }, (_, i) => i + 1) as n (n)}
			<p class="py-4 text-body-md text-muted-foreground">Row {n} — scroll to see sticky header.</p>
		{/each}
	</main>
</Story>

<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { Input } from './index.js';

	const { Story } = defineMeta({
		title: 'UI/Input',
		component: Input
	});
</script>

<Story name="Default">
	<div class="flex max-w-sm flex-col gap-3 bg-background p-6">
		<label class="text-label-md text-muted-foreground" for="story-name">Issuer URL</label>
		<Input id="story-name" placeholder="https://issuer.example.com" />
	</div>
</Story>

<Story name="Disabled">
	<div class="flex max-w-sm flex-col gap-3 bg-background p-6">
		<label class="text-label-md text-muted-foreground" for="story-name-disabled">Issuer URL</label>
		<Input id="story-name-disabled" value="https://example.com" disabled />
	</div>
</Story>

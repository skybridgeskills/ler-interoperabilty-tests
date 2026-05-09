<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { Badge } from './index.js';

	const { Story } = defineMeta({
		title: 'UI/Badge',
		component: Badge
	});
</script>

<Story name="Variants">
	<div class="flex flex-wrap items-center gap-3 bg-background p-6">
		<Badge>Default</Badge>
		<Badge variant="secondary">Secondary</Badge>
		<Badge variant="destructive">Destructive</Badge>
		<Badge variant="outline">Outline</Badge>
	</div>
</Story>

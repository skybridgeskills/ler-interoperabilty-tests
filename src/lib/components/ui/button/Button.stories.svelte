<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { Button } from './index.js';

	const { Story } = defineMeta({
		title: 'UI/Button',
		component: Button,
		parameters: {
			docs: {
				description: {
					component:
						'shadcn-svelte Button rendered against the Tokyo Night palette. Variants and sizes should remain legible in both light and dark modes.'
				}
			}
		}
	});
</script>

<Story name="Variants" asChild>
	<div class="flex flex-wrap gap-3 bg-background p-6">
		<Button variant="default">Default</Button>
		<Button variant="secondary">Secondary</Button>
		<Button variant="destructive">Destructive</Button>
		<Button variant="outline">Outline</Button>
		<Button variant="ghost">Ghost</Button>
		<Button variant="link">Link</Button>
	</div>
</Story>

<Story name="Sizes" asChild>
	<div class="flex flex-wrap items-center gap-3 bg-background p-6">
		<Button size="xs">XS</Button>
		<Button size="sm">Small</Button>
		<Button>Default</Button>
		<Button size="lg">Large</Button>
		<Button size="icon" aria-label="icon button">⌘</Button>
	</div>
</Story>

<Story name="Disabled" asChild>
	<div class="flex gap-3 bg-background p-6">
		<Button disabled>Default</Button>
		<Button variant="outline" disabled>Outline</Button>
		<Button variant="destructive" disabled>Destructive</Button>
	</div>
</Story>

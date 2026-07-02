<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { ThemeToggle } from './index.js';

	const { Story } = defineMeta({
		title: 'Components/ThemeToggle',
		component: ThemeToggle,
		parameters: {
			docs: {
				description: {
					component:
						'Toggles between light and dark. The icon shows the current theme; ' +
						'hover or keyboard focus previews the opposite theme button chrome. ' +
						'First-time visitors ' +
						'follow the OS preference until they click. Persists `light` or `dark` ' +
						'to localStorage and toggles `.dark` on `<html>`.'
				}
			}
		}
	});
</script>

<Story name="Default" asChild>
	<div
		class="flex flex-col items-start gap-4 rounded-md border border-border bg-background p-6 text-foreground"
	>
		<p class="text-label-md text-muted-foreground">Theme toggle</p>
		<ThemeToggle />
		<p class="max-w-prose text-body-md">
			The icon reflects the active theme (sun = light, moon = dark). Hover or Tab-focus to peek at
			the opposite theme's hovered button style. Click toggles between
			<code class="font-mono">light</code> and <code class="font-mono">dark</code>; new visitors
			follow the OS until the first click. The choice is persisted in
			<code class="font-mono">localStorage.theme</code> and applied by toggling the
			<code class="font-mono">.dark</code> class on
			<code class="font-mono">&lt;html&gt;</code>.
		</p>
	</div>
</Story>

<Story name="Inside a card" asChild>
	<div
		class="flex max-w-sm items-center justify-between gap-4 rounded-md border border-border bg-card p-4 text-card-foreground"
	>
		<div>
			<p class="text-title-lg leading-tight">Appearance</p>
			<p class="text-body-md text-muted-foreground">Switch between light and dark.</p>
		</div>
		<ThemeToggle />
	</div>
</Story>

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
						'Cycles light → dark → system → light. Persists choice to ' +
						'localStorage and toggles `.dark` on `<html>`. Click the toggle ' +
						'to see the surrounding background and text adjust.'
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
			The button cycles through three states: <code class="font-mono">light</code>,
			<code class="font-mono">dark</code>, and
			<code class="font-mono">system</code>. The choice is persisted in
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
			<p class="text-body-md text-muted-foreground">Match system or pick a side.</p>
		</div>
		<ThemeToggle />
	</div>
</Story>

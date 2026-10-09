<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { ResponsivePreview } from '$lib/storybook/index.js';

	import PerspectiveGate from './PerspectiveGate.svelte';

	/**
	 * The first-visit gate. A centred dialog from `sm:` up; below it, a bottom
	 * sheet. The sheet switches on the **viewport**, so view the phone form with
	 * the browser (or the pane) at 375px — the preview box below is a hint only.
	 */
	const { Story } = defineMeta({
		title: 'Components/Perspective/PerspectiveGate',
		component: PerspectiveGate
	});
</script>

<script lang="ts">
	let open = $state(true);
</script>

<Story name="Open" asChild>
	<div class="min-h-[480px]">
		<button type="button" class="text-primary underline" onclick={() => (open = true)}>
			Reopen the gate
		</button>
		<PerspectiveGate {open} onChoose={() => (open = false)} onDismiss={() => (open = false)} />
	</div>
</Story>

<Story name="Behind it — page at 375" asChild>
	<ResponsivePreview width={375}>
		<p class="p-4 text-body-md text-muted-foreground">
			Resize the viewport below 640px to see the bottom sheet.
		</p>
	</ResponsivePreview>
</Story>

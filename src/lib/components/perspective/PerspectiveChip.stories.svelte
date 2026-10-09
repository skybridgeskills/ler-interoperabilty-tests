<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import type { Perspective } from '$lib/interop/perspective/index.js';

	import PerspectiveChip from './PerspectiveChip.svelte';

	const { Story } = defineMeta({
		title: 'Components/Perspective/PerspectiveChip',
		component: PerspectiveChip
	});
</script>

<script lang="ts">
	let unset = $state<Perspective | undefined>(undefined);
	let builder = $state<Perspective | undefined>('builder');
	let evaluator = $state<Perspective | undefined>('evaluator');
	let menu = $state<Perspective | undefined>('builder');
</script>

<Story name="Unset" asChild>
	<PerspectiveChip perspective={unset} onChange={(p) => (unset = p)} />
</Story>

<Story name="Builder" asChild>
	<PerspectiveChip perspective={builder} onChange={(p) => (builder = p)} />
</Story>

<Story name="Evaluator" asChild>
	<PerspectiveChip perspective={evaluator} onChange={(p) => (evaluator = p)} />
</Story>

<Story name="Menu open" asChild>
	<div class="h-48">
		<PerspectiveChip perspective={menu} onChange={(p) => (menu = p)} open />
	</div>
</Story>

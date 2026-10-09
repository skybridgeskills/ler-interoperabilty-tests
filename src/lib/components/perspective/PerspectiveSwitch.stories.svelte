<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import type { Perspective } from '$lib/interop/perspective/index.js';
	import { ResponsivePreview } from '$lib/storybook/index.js';

	import PerspectiveSwitch from './PerspectiveSwitch.svelte';

	const { Story } = defineMeta({
		title: 'Components/Perspective/PerspectiveSwitch',
		component: PerspectiveSwitch
	});
</script>

<script lang="ts">
	let unset = $state<Perspective | undefined>(undefined);
	let builder = $state<Perspective | undefined>('builder');
	let evaluator = $state<Perspective | undefined>('evaluator');
	let phone = $state<Perspective | undefined>(undefined);
</script>

<Story name="Unset" asChild>
	<PerspectiveSwitch perspective={unset} onChange={(p) => (unset = p)} />
</Story>

<Story name="Builder" asChild>
	<PerspectiveSwitch perspective={builder} onChange={(p) => (builder = p)} />
</Story>

<Story name="Evaluator" asChild>
	<PerspectiveSwitch perspective={evaluator} onChange={(p) => (evaluator = p)} />
</Story>

<Story name="Phone — stays one line" asChild>
	<ResponsivePreview width={375}>
		<div class="p-4">
			<PerspectiveSwitch perspective={phone} onChange={(p) => (phone = p)} />
		</div>
	</ResponsivePreview>
</Story>

<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { StepRunStateIndicator } from './index.js';

	const { Story } = defineMeta({
		title: 'Interop/Exchange Runner/StepRunStateIndicator',
		component: StepRunStateIndicator
	});
</script>

<Story name="All states" asChild>
	<div class="flex flex-wrap items-center gap-4 bg-background p-6">
		<StepRunStateIndicator state="pending" />
		<StepRunStateIndicator state="in-flight" />
		<StepRunStateIndicator state="complete" />
		<StepRunStateIndicator state="skipped" />
	</div>
</Story>

<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import CompletionMeter from './CompletionMeter.svelte';

	const { Story } = defineMeta({
		title: 'Interop/Completion Group/CompletionMeter',
		component: CompletionMeter
	});
</script>

{#snippet allStates()}
	<div class="max-w-md space-y-4">
		<CompletionMeter met={0} total={12} />
		<CompletionMeter met={7} total={12} />
		<CompletionMeter met={12} total={12} />
	</div>
{/snippet}

<Story name="Empty (0/12)" asChild>
	<div class="max-w-md bg-background p-6">
		<CompletionMeter met={0} total={12} />
	</div>
</Story>

<Story name="Partial (7/12)" asChild>
	<div class="max-w-md bg-background p-6">
		<CompletionMeter met={7} total={12} />
	</div>
</Story>

<Story name="Full (12/12)" asChild>
	<div class="max-w-md bg-background p-6">
		<CompletionMeter met={12} total={12} />
	</div>
</Story>

<!-- All fill states in light + dark side by side. -->
<Story name="All states — light + dark" asChild>
	<div class="grid gap-4 sm:grid-cols-2">
		<div class="bg-background p-6">
			{@render allStates()}
		</div>
		<div class="dark">
			<div class="bg-background p-6">
				{@render allStates()}
			</div>
		</div>
	</div>
</Story>

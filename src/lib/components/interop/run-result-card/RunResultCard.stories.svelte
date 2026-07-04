<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import RunResultCard from './RunResultCard.svelte';

	const { Story } = defineMeta({
		title: 'Interop/Run Result Card/RunResultCard',
		component: RunResultCard
	});
</script>

{#snippet allOutcomes()}
	<div class="max-w-md space-y-3">
		<RunResultCard outcome="verified" />
		<RunResultCard outcome="not-verified" failingMustCount={2} />
		<RunResultCard outcome="stopped-early" stoppedAtStep={2} />
		<RunResultCard
			outcome="error"
			message="The credential offer URL could not be fetched."
			hint="Check the URL is reachable and try again."
		/>
	</div>
{/snippet}

<!-- All four outcomes side by side in light + dark. -->
<Story name="All outcomes — light + dark" asChild>
	<div class="grid gap-4 sm:grid-cols-2">
		<div class="bg-background p-6">
			{@render allOutcomes()}
		</div>
		<div class="dark">
			<div class="bg-background p-6">
				{@render allOutcomes()}
			</div>
		</div>
	</div>
</Story>

<Story name="Verified" asChild>
	<div class="max-w-md bg-background p-6">
		<RunResultCard outcome="verified" />
	</div>
</Story>

<Story name="Not verified" asChild>
	<div class="max-w-md bg-background p-6">
		<RunResultCard outcome="not-verified" failingMustCount={3} />
	</div>
</Story>

<Story name="Stopped early" asChild>
	<div class="max-w-md bg-background p-6">
		<RunResultCard outcome="stopped-early" stoppedAtStep={2} />
	</div>
</Story>

<Story name="Error" asChild>
	<div class="max-w-md bg-background p-6">
		<RunResultCard
			outcome="error"
			message="The interaction URL could not be fetched."
			hint="Check the URL is reachable and try again."
		/>
	</div>
</Story>

<!-- No outcome yet → renders nothing. -->
<Story name="No result (renders nothing)" asChild>
	<div class="max-w-md bg-background p-6">
		<RunResultCard />
	</div>
</Story>

<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import {
		outcomeToRequirementStatus,
		stepStateToRequirementStatus
	} from '$lib/components/interop/requirement-status-row/requirement-status-view.js';
	import type { CheckOutcome } from '$lib/server/domain/issuer-runner/check-outcome.js';

	import RunStatusIndicator from './RunStatusIndicator.svelte';

	const { Story } = defineMeta({
		title: 'Interop/RunStatusIndicator',
		component: RunStatusIndicator
	});

	const outcome = (status: CheckOutcome['status']): CheckOutcome => ({
		id: 'x',
		level: 'MUST',
		status,
		message: `${status} message`
	});
</script>

<!--
	The step-level `● LABEL` indicator across every state. Same dot + label tone source as a
	RequirementStatusRow, so a step header reads like a summary of its rows. Toggle the Storybook
	theme to check light + dark.
-->
<Story name="All states" asChild>
	<div class="flex flex-col items-start gap-3 bg-background p-6">
		<RunStatusIndicator status={stepStateToRequirementStatus('pending')} />
		<RunStatusIndicator status={stepStateToRequirementStatus('in-flight')} />
		<RunStatusIndicator status={stepStateToRequirementStatus('complete')} />
		<RunStatusIndicator status={stepStateToRequirementStatus('failed')} />
		<RunStatusIndicator status={stepStateToRequirementStatus('skipped')} />
		<RunStatusIndicator status={outcomeToRequirementStatus(outcome('pass'))} />
		<RunStatusIndicator status={outcomeToRequirementStatus(outcome('warn'))} />
		<RunStatusIndicator status={outcomeToRequirementStatus(outcome('fail'))} />
	</div>
</Story>

<Story name="In progress" asChild>
	<div class="bg-background p-6">
		<RunStatusIndicator status={stepStateToRequirementStatus('in-flight')} />
	</div>
</Story>

<Story name="Done" asChild>
	<div class="bg-background p-6">
		<RunStatusIndicator status={stepStateToRequirementStatus('complete')} />
	</div>
</Story>

<Story name="Failed" asChild>
	<div class="bg-background p-6">
		<RunStatusIndicator status={stepStateToRequirementStatus('failed')} />
	</div>
</Story>

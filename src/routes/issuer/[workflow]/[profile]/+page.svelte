<script lang="ts">
	import { WorkflowChecklist } from '$lib/components/interop/workflow-checklist/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	import { resolve } from '$app/paths';

	let { data } = $props();

	const hasRunner = $derived(
		data.workflow.slug === 'direct-credential-issuance' &&
			data.profile.slug === 'ob3-direct-delivery'
	);
	const runnerHref = $derived(
		resolve('/issuer/direct-credential-issuance/ob3-direct-delivery/run')
	);
</script>

{#if hasRunner}
	<div class="mb-8 rounded-md border border-primary/40 bg-primary/10 p-4">
		<p class="text-label-md text-primary uppercase">Live test runner</p>
		<p class="mt-1 text-body-md text-foreground">
			Paste a delivered credential and run automated checks against this checklist plus any optional
			additive profiles you select.
		</p>
		<div class="mt-3">
			<Button href={runnerHref}>Run this →</Button>
		</div>
	</div>
{/if}

<WorkflowChecklist
	checklist={data.checklist}
	profile={data.profile}
	workflow={data.workflow}
	role={data.role}
	additives={data.additives}
/>

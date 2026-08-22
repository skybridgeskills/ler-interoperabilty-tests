<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { roleBySlug, workflowBySlug } from '$lib/interop/index.js';
	import { allScenarios } from '$lib/interop/scenarios/index.js';

	import { WorkflowCard } from './index.js';

	const issuer = roleBySlug('issuer')!;
	const credentialIssuance = workflowBySlug('credential-issuance')!;

	// The card lists scenarios now, not profiles — M13 deleted the legacy pages
	// its profile links pointed at.
	const scenarios = allScenarios.filter(
		(s) => s.role === 'issuer' && s.workflow === 'credential-issuance'
	);

	const { Story } = defineMeta({
		title: 'Interop/WorkflowCard',
		component: WorkflowCard
	});
</script>

<Story name="Issuer / Credential Issuance" asChild>
	<div class="max-w-md bg-background p-6">
		<WorkflowCard role={issuer} workflow={credentialIssuance} {scenarios} />
	</div>
</Story>

<!-- A workflow the catalog has nothing for yet — the honest empty state. -->
<Story name="No scenarios yet" asChild>
	<div class="max-w-md bg-background p-6">
		<WorkflowCard role={issuer} workflow={credentialIssuance} scenarios={[]} />
	</div>
</Story>

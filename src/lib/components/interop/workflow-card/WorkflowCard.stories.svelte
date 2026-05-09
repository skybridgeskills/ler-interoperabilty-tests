<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { profilesForCombination, roleBySlug, workflowBySlug } from '$lib/interop/index.js';

	import { WorkflowCard } from './index.js';

	const issuer = roleBySlug('issuer')!;
	const credentialIssuance = workflowBySlug('credential-issuance')!;
	const profiles = profilesForCombination('issuer', 'credential-issuance');

	const { Story } = defineMeta({
		title: 'Interop/WorkflowCard',
		component: WorkflowCard,
		args: { workflow: credentialIssuance, role: issuer, profiles }
	});
</script>

<Story name="Issuer / Credential Issuance">
	<div class="max-w-md bg-background p-6">
		<WorkflowCard role={issuer} workflow={credentialIssuance} {profiles} />
	</div>
</Story>

<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import {
		additiveChecklistsForCombination,
		combinationFor,
		roleBySlug,
		workflowBySlug
	} from '$lib/interop/index.js';

	import { WorkflowChecklist } from './index.js';

	const role = roleBySlug('issuer')!;
	const workflow = workflowBySlug('credential-issuance')!;
	const combo = combinationFor('issuer', 'credential-issuance', 'vcalm')!;
	const additives = additiveChecklistsForCombination('vcalm', 'issuer', 'credential-issuance');

	const { Story } = defineMeta({
		title: 'Interop/WorkflowChecklist',
		component: WorkflowChecklist
	});
</script>

<Story name="Issuer / Credential Issuance / VCALM" asChild>
	<div class="mx-auto max-w-3xl bg-background p-6">
		<WorkflowChecklist checklist={combo.checklist} profile={combo.profile} {workflow} {role} />
	</div>
</Story>

<Story name="Combined view (base + DI additive)" asChild>
	<div class="mx-auto max-w-3xl bg-background p-6">
		<WorkflowChecklist
			checklist={combo.checklist}
			profile={combo.profile}
			{workflow}
			{role}
			{additives}
		/>
	</div>
</Story>

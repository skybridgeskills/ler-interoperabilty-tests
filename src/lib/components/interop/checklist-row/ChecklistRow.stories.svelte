<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { checklistHref, profileBySlug, roleBySlug, workflowBySlug } from '$lib/interop/index.js';

	import { ChecklistRow } from './index.js';

	const combination = {
		role: roleBySlug('issuer')!,
		workflow: workflowBySlug('direct-credential-issuance')!,
		profile: profileBySlug('ob3-direct-delivery')!
	};
	const href = checklistHref('issuer', 'direct-credential-issuance', 'ob3-direct-delivery');

	const { Story } = defineMeta({
		title: 'Interop/ChecklistRow',
		component: ChecklistRow
	});
</script>

<!--
	The row is statusless. It used to carry the combination's run history, which
	is gone along with the combination-keyed store — a combination is not a
	scenario, so there is nothing to show. What remains is selected vs not, and
	which additives apply.
-->
<Story name="States" asChild>
	<div class="max-w-2xl space-y-3 bg-background p-6">
		<ChecklistRow {combination} {href} selected />
		<ChecklistRow {combination} {href} selected={false} />
	</div>
</Story>

<Story name="With applied additives" asChild>
	<div class="max-w-2xl space-y-3 bg-background p-6">
		<ChecklistRow
			{combination}
			{href}
			selected
			appliedAdditives={[
				{ slug: 'data-integrity-cryptosuites', name: 'Data Integrity Cryptosuites' },
				{ slug: 'open-skill-alignment', name: 'Open Skill Alignment' }
			]}
		/>
	</div>
</Story>

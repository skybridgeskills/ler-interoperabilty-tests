<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import {
		checklistHref,
		exchangeRunRecord,
		issuerReportRunRecord,
		profileBySlug,
		roleBySlug,
		workflowBySlug
	} from '$lib/interop/index.js';

	import { ChecklistRow } from './index.js';

	const combination = {
		role: roleBySlug('issuer')!,
		workflow: workflowBySlug('direct-credential-issuance')!,
		profile: profileBySlug('ob3-direct-delivery')!
	};
	const href = checklistHref('issuer', 'direct-credential-issuance', 'ob3-direct-delivery');

	const passed = issuerReportRunRecord({
		role: 'issuer',
		workflow: 'direct-credential-issuance',
		profile: 'ob3-direct-delivery',
		verified: true,
		failingMustCount: 0
	});
	const failed = issuerReportRunRecord({
		role: 'issuer',
		workflow: 'direct-credential-issuance',
		profile: 'ob3-direct-delivery',
		verified: false,
		failingMustCount: 2
	});
	const incomplete = exchangeRunRecord({
		role: 'issuer',
		workflow: 'direct-credential-issuance',
		profile: 'ob3-direct-delivery',
		exchangeState: 'active',
		derived: { run: 'awaiting-wallet', perStep: ['in-flight'] }
	});

	const { Story } = defineMeta({
		title: 'Interop/ChecklistRow',
		component: ChecklistRow
	});
</script>

<Story name="States" asChild>
	<div class="max-w-2xl space-y-3 bg-background p-6">
		<ChecklistRow {combination} {href} selected latestRun={passed} />
		<ChecklistRow {combination} {href} selected latestRun={failed} />
		<ChecklistRow {combination} {href} selected latestRun={incomplete} />
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
			latestRun={passed}
			appliedAdditives={[
				{ slug: 'data-integrity-cryptosuites', name: 'Data Integrity Cryptosuites' },
				{ slug: 'open-skill-alignment', name: 'Open Skill Alignment' }
			]}
		/>
	</div>
</Story>

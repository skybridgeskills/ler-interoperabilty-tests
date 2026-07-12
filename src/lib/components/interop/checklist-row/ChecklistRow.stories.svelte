<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import {
		checklistHref,
		combinedRequirements,
		profileBySlug,
		roleBySlug,
		runChecklistFingerprint,
		statusFromExchange,
		statusFromIssuerReport,
		testRunRecord,
		workflowBySlug
	} from '$lib/interop/index.js';

	import { ChecklistRow } from './index.js';

	const combination = {
		role: roleBySlug('issuer')!,
		workflow: workflowBySlug('direct-credential-issuance')!,
		profile: profileBySlug('ob3-direct-delivery')!
	};
	const href = checklistHref('issuer', 'direct-credential-issuance', 'ob3-direct-delivery');

	const passed = testRunRecord({
		role: 'issuer',
		workflow: 'direct-credential-issuance',
		profile: 'ob3-direct-delivery',
		status: statusFromIssuerReport({ verified: true }),
		checklistFingerprint: '',
		statuses: {}
	});
	const failed = testRunRecord({
		role: 'issuer',
		workflow: 'direct-credential-issuance',
		profile: 'ob3-direct-delivery',
		status: statusFromIssuerReport({ verified: false }),
		checklistFingerprint: '',
		statuses: {}
	});
	const incomplete = testRunRecord({
		role: 'issuer',
		workflow: 'direct-credential-issuance',
		profile: 'ob3-direct-delivery',
		status: statusFromExchange({ run: 'awaiting-wallet', perStep: ['in-flight'] }),
		checklistFingerprint: '',
		statuses: {}
	});

	// Live fingerprint for this combination, so the newest run reads as current
	// while the older runs (empty fingerprint) get pre-flagged "Outdated".
	const liveFingerprint = runChecklistFingerprint(
		combinedRequirements('issuer', 'direct-credential-issuance', 'ob3-direct-delivery')
	);
	const DAY = 24 * 60 * 60 * 1000;
	const now = Date.now();
	const recentRuns = [
		{
			...passed,
			id: 'run-1',
			ranAt: new Date(now).toISOString(),
			checklistFingerprint: liveFingerprint
		},
		{ ...failed, id: 'run-2', ranAt: new Date(now - 2 * DAY).toISOString() },
		{ ...incomplete, id: 'run-3', ranAt: new Date(now - 9 * DAY).toISOString() }
	];

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

<Story name="Recent runs (expandable)" asChild>
	<div class="max-w-2xl space-y-3 bg-background p-6">
		<!-- Click "3 runs" to expand the recent-runs list; older runs are flagged Outdated. -->
		<ChecklistRow {combination} {href} selected latestRun={recentRuns[0]} {recentRuns} />
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

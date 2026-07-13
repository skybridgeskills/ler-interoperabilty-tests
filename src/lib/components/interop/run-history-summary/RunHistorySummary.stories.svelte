<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { statusFromExchange, statusFromIssuerReport, testRunRecord } from '$lib/interop/index.js';

	import { RunHistorySummary } from './index.js';

	const passed = testRunRecord({
		role: 'issuer',
		workflow: 'direct-credential-issuance',
		profile: 'ob3-direct-delivery',
		status: statusFromIssuerReport({ verified: true }),
		checklistFingerprint: 'abc',
		statuses: {}
	});
	// A day-old failed wallet run, to exercise relative time + a different result tone.
	const failed = testRunRecord({
		role: 'wallet',
		workflow: 'credential-acceptance',
		profile: 'vcalm',
		status: statusFromExchange({ run: 'error', perStep: ['failed', 'skipped'] }),
		checklistFingerprint: 'def',
		statuses: {}
	});
	failed.ranAt = new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString();

	const noop = () => {};

	const { Story } = defineMeta({
		title: 'Interop/RunHistorySummary',
		component: RunHistorySummary
	});
</script>

<Story name="Passed run" asChild>
	<div class="max-w-sm bg-background p-6">
		<RunHistorySummary record={passed} onRerun={noop} onPrint={noop} />
	</div>
</Story>

<Story name="Failed run (a day ago)" asChild>
	<div class="max-w-sm bg-background p-6">
		<RunHistorySummary record={failed} onRerun={noop} onPrint={noop} />
	</div>
</Story>

<Story name="With inline outdated notice" asChild>
	<div class="max-w-sm bg-background p-6">
		<RunHistorySummary record={passed} onRerun={noop} onPrint={noop} outdated />
	</div>
</Story>

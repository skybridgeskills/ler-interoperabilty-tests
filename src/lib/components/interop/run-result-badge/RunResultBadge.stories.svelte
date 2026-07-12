<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { statusFromExchange, statusFromIssuerReport, testRunRecord } from '$lib/interop/index.js';

	import { RunResultBadge } from './index.js';

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
		role: 'wallet',
		workflow: 'credential-acceptance',
		profile: 'vcalm',
		status: statusFromExchange({ run: 'awaiting-wallet', perStep: ['in-flight', 'pending'] }),
		checklistFingerprint: '',
		statuses: {}
	});

	const { Story } = defineMeta({
		title: 'Interop/RunResultBadge',
		component: RunResultBadge
	});
</script>

<Story name="All states" asChild>
	<div class="flex flex-wrap items-center gap-3 bg-background p-6">
		<RunResultBadge record={passed} />
		<RunResultBadge record={failed} />
		<RunResultBadge record={incomplete} />
		<RunResultBadge />
	</div>
</Story>

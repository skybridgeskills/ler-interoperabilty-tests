<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { exchangeRunRecord, issuerReportRunRecord } from '$lib/interop/index.js';

	import { RunResultBadge } from './index.js';

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
		role: 'wallet',
		workflow: 'credential-acceptance',
		profile: 'vcalm',
		exchangeState: 'active',
		derived: { run: 'awaiting-wallet', perStep: ['in-flight', 'pending'] }
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

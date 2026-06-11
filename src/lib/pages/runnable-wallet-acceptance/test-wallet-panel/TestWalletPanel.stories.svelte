<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import type { IssuerRunnerReport } from '$lib/server/domain/issuer-runner/issuer-runner-report.js';

	import { TestWalletPanel } from './index.js';

	const { Story } = defineMeta({
		title: 'Pages/RunnableWalletAcceptance/TestWalletPanel',
		component: TestWalletPanel
	});

	const passingReport: IssuerRunnerReport = {
		verified: true,
		groups: [
			{
				checklist: {
					kind: 'base',
					profileSlug: 'vcalm',
					profileName: 'Verifiable Credentials Asset Lifecycle Management',
					workflow: 'credential-acceptance',
					role: 'wallet'
				},
				outcomes: [
					{
						id: 'vcalm.vc-data-model-v2-compliant',
						level: 'MUST',
						status: 'pass',
						message: 'VC Data Model 2.0 context and type present.'
					},
					{
						id: 'vcalm.data-integrity-proof',
						level: 'MUST',
						status: 'pass',
						message: 'Credential carries a verifiable Data Integrity proof.'
					}
				]
			}
		]
	};

	const noop = () => {};
</script>

<Story name="Idle — before run" asChild>
	<div class="max-w-3xl bg-background p-6">
		<TestWalletPanel onRun={noop} />
	</div>
</Story>

<Story name="Running" asChild>
	<div class="max-w-3xl bg-background p-6">
		<TestWalletPanel busy onRun={noop} />
	</div>
</Story>

<Story name="Complete — passing report" asChild>
	<div class="max-w-3xl bg-background p-6">
		<TestWalletPanel report={passingReport} onRun={noop} />
	</div>
</Story>

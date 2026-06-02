<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import type { IssuerRunnerReport } from '$lib/server/domain/issuer-runner/issuer-runner-report.js';

	import { IssuerRunnerPanel } from './index.js';

	const { Story } = defineMeta({
		title: 'Interop/Issuer Runner/IssuerRunnerPanel',
		component: IssuerRunnerPanel
	});

	const noopActions = {
		onCredentialChange: () => {},
		onToggleAdditive: () => {},
		onLoadSample: () => {},
		onVerify: () => {}
	};

	const passingAdditiveReport: IssuerRunnerReport = {
		verified: true,
		groups: [
			{
				checklist: {
					kind: 'base',
					profileSlug: 'ob3-direct-delivery',
					profileName: 'OB 3.0 Direct Delivery Profile',
					workflow: 'direct-credential-issuance',
					role: 'issuer'
				},
				outcomes: [
					{
						id: 'ob3-direct-delivery.vc-data-model-v2-compliant',
						level: 'MUST',
						status: 'pass',
						message: 'VC Data Model 2.0 context and type present.'
					}
				]
			},
			{
				checklist: {
					kind: 'additive',
					profileSlug: 'open-skill-alignment',
					profileName: 'Open Skill Alignment',
					workflow: 'direct-credential-issuance',
					role: 'issuer'
				},
				outcomes: [
					{
						id: 'open-skill-alignment.result-description.present',
						level: 'MUST',
						status: 'pass',
						message: 'Found 1 resultDescription entry.'
					},
					{
						id: 'open-skill-alignment.result-description.ctdl-alignment',
						level: 'SHOULD',
						status: 'pass',
						message: '1 alignment.targetUrl(s) all match the CTDL Credential Registry allowlist.'
					}
				]
			}
		]
	};
</script>

<Story name="Idle" asChild>
	<div class="max-w-3xl bg-background p-6">
		<IssuerRunnerPanel
			data={{ credentialText: '', includeAdditive: false, status: 'idle' }}
			actions={noopActions}
		/>
	</div>
</Story>

<Story name="Running with text" asChild>
	<div class="max-w-3xl bg-background p-6">
		<IssuerRunnerPanel
			data={{
				credentialText: '{ "@context": [], "type": ["VerifiableCredential"] }',
				includeAdditive: true,
				status: 'running'
			}}
			actions={noopActions}
		/>
	</div>
</Story>

<Story name="Done — passing additive" asChild>
	<div class="max-w-3xl bg-background p-6">
		<IssuerRunnerPanel
			data={{
				credentialText: '{ "type": ["VerifiableCredential","OpenBadgeCredential"] }',
				includeAdditive: true,
				status: 'done',
				report: passingAdditiveReport
			}}
			actions={noopActions}
		/>
	</div>
</Story>

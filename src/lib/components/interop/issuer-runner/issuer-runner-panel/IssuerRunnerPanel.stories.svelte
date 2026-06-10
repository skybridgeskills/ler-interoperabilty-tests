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
			},
			{
				checklist: {
					kind: 'additive',
					profileSlug: 'data-integrity-cryptosuites',
					profileName: 'Data Integrity Cryptosuites',
					workflow: 'direct-credential-issuance',
					role: 'issuer'
				},
				outcomes: [
					{
						id: 'data-integrity-cryptosuites.issuer.direct-credential-issuance.producer.cryptosuite-supported',
						level: 'MUST',
						status: 'pass',
						message: 'proof.cryptosuite `eddsa-rdfc-2022` is in the bundle.'
					},
					{
						id: 'data-integrity-cryptosuites.issuer.direct-credential-issuance.producer.did-method',
						level: 'MUST',
						status: 'pass',
						message: 'Issuer uses did:key.'
					},
					{
						id: 'data-integrity-cryptosuites.issuer.direct-credential-issuance.producer.key-type-matches',
						level: 'MUST',
						status: 'n/a',
						message: 'No automated check registered for this requirement yet.'
					}
				]
			}
		]
	};
</script>

<Story name="Idle" asChild>
	<div class="max-w-3xl bg-background p-6">
		<IssuerRunnerPanel
			data={{ credentialText: '', selectedAdditives: [], status: 'idle' }}
			actions={noopActions}
		/>
	</div>
</Story>

<Story name="Running with text" asChild>
	<div class="max-w-3xl bg-background p-6">
		<IssuerRunnerPanel
			data={{
				credentialText: '{ "@context": [], "type": ["VerifiableCredential"] }',
				selectedAdditives: ['open-skill-alignment', 'data-integrity-cryptosuites'],
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
				selectedAdditives: ['open-skill-alignment', 'data-integrity-cryptosuites'],
				status: 'done',
				report: passingAdditiveReport
			}}
			actions={noopActions}
		/>
	</div>
</Story>

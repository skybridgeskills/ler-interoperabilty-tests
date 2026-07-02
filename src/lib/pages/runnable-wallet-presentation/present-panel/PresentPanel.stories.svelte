<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import type { IssuerRunnerReport } from '$lib/server/domain/issuer-runner/issuer-runner-report.js';

	import type { PresentResult } from './present-result.js';

	import { PresentPanel } from './index.js';

	const { Story } = defineMeta({
		title: 'Pages/RunnableWalletPresentation/PresentPanel',
		component: PresentPanel
	});

	const passingReport: IssuerRunnerReport = {
		verified: true,
		groups: [
			{
				checklist: {
					kind: 'base',
					profileSlug: 'oid4',
					profileName: 'OID4VP',
					workflow: 'credential-presentation',
					role: 'wallet'
				},
				outcomes: [
					{
						id: 'oid4.di-vp-not-jwt',
						level: 'MUST',
						status: 'pass',
						message: 'Presentation is a Data Integrity VP (`di_vp` / `ldp_vp`).'
					},
					{
						id: 'oid4.preserve-credential-proofs',
						level: 'MUST',
						status: 'pass',
						message: 'Original credential proofs are preserved.'
					}
				]
			}
		]
	};

	const completeResult: PresentResult = {
		matched: true,
		vpToken: {
			'@context': ['https://www.w3.org/ns/credentials/v2'],
			type: ['VerifiablePresentation'],
			verifiableCredential: ['<jwt-or-embedded-vc>']
		},
		presentationSubmission: {
			id: 'submission-1',
			definition_id: 'definition-1',
			descriptor_map: [{ id: 'ob3', format: 'ldp_vp', path: '$' }]
		},
		verify: { verified: true },
		submitted: true,
		submissionResult: { redirect_uri: 'https://verifier.example/done' },
		report: passingReport,
		failingMustCount: 0
	};

	const noop = () => {};
</script>

<Story name="Idle — before run" asChild>
	<div class="max-w-3xl bg-background p-6">
		<PresentPanel onInput={noop} onUriInput={noop} onPresent={noop} />
	</div>
</Story>

<Story name="Presenting" asChild>
	<div class="max-w-3xl bg-background p-6">
		<PresentPanel
			busy
			requestText={'{ "response_type": "vp_token" }'}
			onInput={noop}
			onUriInput={noop}
			onPresent={noop}
		/>
	</div>
</Story>

<Story name="Complete — passing report" asChild>
	<div class="max-w-3xl bg-background p-6">
		<PresentPanel result={completeResult} onInput={noop} onUriInput={noop} onPresent={noop} />
	</div>
</Story>

<Story name="Invalid JSON error" asChild>
	<div class="max-w-3xl bg-background p-6">
		<PresentPanel
			error={{
				message: 'The pasted text is not valid JSON.',
				hint: 'Paste the verifier’s OID4VP authorization request as a JSON object.'
			}}
			onInput={noop}
			onUriInput={noop}
			onPresent={noop}
		/>
	</div>
</Story>

<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import type { WalletActivity, WalletArtifact } from '$lib/interop/wallet-activity.js';

	import VcalmIssuerFlowWallet from './VcalmIssuerFlowWallet.svelte';

	const { Story } = defineMeta({
		title: 'Interop/Test Wallet/VcalmIssuerFlowWallet',
		component: VcalmIssuerFlowWallet
	});

	const noop = () => {};

	const URL = 'https://issuer.example/exchanges/ex-1';

	const runningActivity: WalletActivity[] = [
		{
			id: 'r1',
			kind: 'interaction',
			label: 'Fetched the interaction exchange',
			status: 'ok',
			stepIndex: 1
		},
		{
			id: 'r2',
			kind: 'interaction',
			label: 'Authenticating with a did:key holder…',
			status: 'info',
			stepIndex: 2
		}
	];

	const verifiedActivity: WalletActivity[] = [
		{
			id: 'a1',
			kind: 'interaction',
			label: 'Fetched the interaction exchange',
			status: 'ok',
			stepIndex: 1
		},
		{
			id: 'a2',
			kind: 'interaction',
			label: 'Authenticated with a did:key holder',
			status: 'ok',
			stepIndex: 2
		},
		{ id: 'a3', kind: 'interaction', label: 'Received the credential', status: 'ok', stepIndex: 3 },
		{
			id: 'a4',
			kind: 'check',
			label: 'Credential signature verified',
			detail: 'eddsa-rdfc-2022 · issuer key matched',
			status: 'ok',
			stepIndex: 3
		},
		{ id: 'a5', kind: 'check', label: 'Issuer DID resolved', status: 'ok', stepIndex: 3 },
		{
			id: 'a6',
			kind: 'check',
			label: 'Expiration within policy',
			detail: 'Expires in 14 days',
			status: 'warn',
			stepIndex: 3
		}
	];

	const notVerifiedActivity: WalletActivity[] = [
		{
			id: 'b1',
			kind: 'interaction',
			label: 'Fetched the interaction exchange',
			status: 'ok',
			stepIndex: 1
		},
		{
			id: 'b2',
			kind: 'interaction',
			label: 'Authenticated with a did:key holder',
			status: 'ok',
			stepIndex: 2
		},
		{ id: 'b3', kind: 'interaction', label: 'Received the credential', status: 'ok', stepIndex: 3 },
		{
			id: 'b4',
			kind: 'check',
			label: 'Credential signature verified',
			detail: 'Proof did not verify against the issuer key',
			status: 'fail',
			stepIndex: 3
		},
		{ id: 'b5', kind: 'check', label: 'Credential subject present', status: 'ok', stepIndex: 3 }
	];

	const stoppedEarlyActivity: WalletActivity[] = [
		{
			id: 'c1',
			kind: 'interaction',
			label: 'Fetched the interaction exchange',
			status: 'ok',
			stepIndex: 1
		},
		{
			id: 'c2',
			kind: 'interaction',
			label: 'Authenticated with a did:key holder',
			detail: 'Issuer rejected the DID auth response',
			status: 'fail',
			stepIndex: 2
		},
		{
			id: 'c3',
			kind: 'check',
			label: 'Credential delivery',
			detail: 'Not reached — flow stopped at step 2',
			status: 'skipped',
			stepIndex: 3
		}
	];

	const verifiedArtifact: WalletArtifact[] = [
		{
			kind: 'credential',
			title: 'CourseCompletionCredential',
			issuer: 'did:web:issuer.example',
			issuanceDate: '2026-06-30',
			verified: true,
			types: ['VerifiableCredential', 'OpenBadgeCredential']
		}
	];

	const unverifiedArtifact: WalletArtifact[] = [
		{
			kind: 'credential',
			title: 'CourseCompletionCredential',
			issuer: 'did:web:issuer.example',
			issuanceDate: '2026-06-30',
			verified: false,
			types: ['VerifiableCredential']
		}
	];
</script>

<!-- Semantic VCALM copy + the holder-cryptosuite settings select. Toggle the Storybook theme for light + dark. -->
<Story name="Idle" asChild>
	<div class="max-w-md bg-background p-6">
		<VcalmIssuerFlowWallet state="idle" onRun={noop} onReset={noop} />
	</div>
</Story>

<Story name="Running" asChild>
	<div class="max-w-md bg-background p-6">
		<VcalmIssuerFlowWallet
			value={URL}
			state="running"
			busy
			activity={runningActivity}
			onRun={noop}
			onReset={noop}
		/>
	</div>
</Story>

<Story name="Verified with artifact" asChild>
	<div class="max-w-md bg-background p-6">
		<VcalmIssuerFlowWallet
			value={URL}
			state="done"
			activity={verifiedActivity}
			artifacts={verifiedArtifact}
			onRun={noop}
			onReset={noop}
		/>
	</div>
</Story>

<Story name="Not verified" asChild>
	<div class="max-w-md bg-background p-6">
		<VcalmIssuerFlowWallet
			value={URL}
			state="done"
			activity={notVerifiedActivity}
			artifacts={unverifiedArtifact}
			onRun={noop}
			onReset={noop}
		/>
	</div>
</Story>

<Story name="Stopped early" asChild>
	<div class="max-w-md bg-background p-6">
		<VcalmIssuerFlowWallet
			value={URL}
			state="done"
			activity={stoppedEarlyActivity}
			onRun={noop}
			onReset={noop}
		/>
	</div>
</Story>

<Story name="Error" asChild>
	<div class="max-w-md bg-background p-6">
		<VcalmIssuerFlowWallet value={URL} state="error" onRun={noop} onReset={noop} />
	</div>
</Story>

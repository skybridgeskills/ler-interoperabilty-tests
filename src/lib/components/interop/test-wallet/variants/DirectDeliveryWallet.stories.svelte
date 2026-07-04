<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import type { WalletActivity, WalletArtifact } from '$lib/interop/wallet-activity.js';

	import DirectDeliveryWallet from './DirectDeliveryWallet.svelte';

	const { Story } = defineMeta({
		title: 'Interop/Test Wallet/DirectDeliveryWallet',
		component: DirectDeliveryWallet
	});

	const noop = () => {};

	const SAMPLE = JSON.stringify(
		{
			'@context': ['https://www.w3.org/ns/credentials/v2'],
			type: ['VerifiableCredential', 'OpenBadgeCredential'],
			issuer: 'did:web:issuer.example',
			validFrom: '2026-06-30T00:00:00Z'
		},
		null,
		2
	);

	const runningActivity: WalletActivity[] = [
		{ id: 'r1', kind: 'interaction', label: 'Loaded the delivered credential', status: 'info' },
		{ id: 'r2', kind: 'check', label: 'Running verifier-core checks…', status: 'info' }
	];

	const verifiedActivity: WalletActivity[] = [
		{ id: 'a1', kind: 'interaction', label: 'Loaded the delivered credential', status: 'info' },
		{
			id: 'a2',
			kind: 'check',
			label: 'Credential signature verified',
			detail: 'eddsa-rdfc-2022 · issuer key matched',
			status: 'ok'
		},
		{ id: 'a3', kind: 'check', label: 'Required OB3 properties present', status: 'ok' },
		{
			id: 'a4',
			kind: 'check',
			label: 'Recommended evidence present',
			detail: 'No `evidence` array supplied',
			status: 'warn'
		}
	];

	const notVerifiedActivity: WalletActivity[] = [
		{ id: 'b1', kind: 'interaction', label: 'Loaded the delivered credential', status: 'info' },
		{
			id: 'b2',
			kind: 'check',
			label: 'Credential signature verified',
			detail: 'Proof did not verify against the issuer key',
			status: 'fail'
		},
		{ id: 'b3', kind: 'check', label: 'Required OB3 properties present', status: 'ok' }
	];

	const stoppedEarlyActivity: WalletActivity[] = [
		{
			id: 'c1',
			kind: 'interaction',
			label: 'Loaded the delivered credential',
			detail: 'Document is not valid JSON',
			status: 'fail'
		},
		{
			id: 'c2',
			kind: 'check',
			label: 'Verifier-core checks',
			detail: 'Not reached — could not parse the credential',
			status: 'skipped'
		}
	];

	const verifiedArtifact: WalletArtifact[] = [
		{
			kind: 'credential',
			title: 'OpenBadgeCredential',
			issuer: 'did:web:issuer.example',
			issuanceDate: '2026-06-30',
			verified: true,
			types: ['VerifiableCredential', 'OpenBadgeCredential']
		}
	];

	const unverifiedArtifact: WalletArtifact[] = [
		{
			kind: 'credential',
			title: 'OpenBadgeCredential',
			issuer: 'did:web:issuer.example',
			issuanceDate: '2026-06-30',
			verified: false,
			types: ['VerifiableCredential', 'OpenBadgeCredential']
		}
	];
</script>

<!-- Paste variant: textarea + "Verify credential" + "Load sample", NO settings section. Toggle the Storybook theme for light + dark. -->
<Story name="Idle" asChild>
	<div class="max-w-md bg-background p-6">
		<DirectDeliveryWallet state="idle" onRun={noop} onReset={noop} onLoadSample={noop} />
	</div>
</Story>

<Story name="Running" asChild>
	<div class="max-w-md bg-background p-6">
		<DirectDeliveryWallet
			value={SAMPLE}
			state="running"
			busy
			activity={runningActivity}
			onRun={noop}
			onReset={noop}
			onLoadSample={noop}
		/>
	</div>
</Story>

<Story name="Verified with artifact" asChild>
	<div class="max-w-md bg-background p-6">
		<DirectDeliveryWallet
			value={SAMPLE}
			state="done"
			activity={verifiedActivity}
			artifacts={verifiedArtifact}
			onRun={noop}
			onReset={noop}
			onLoadSample={noop}
		/>
	</div>
</Story>

<Story name="Not verified" asChild>
	<div class="max-w-md bg-background p-6">
		<DirectDeliveryWallet
			value={SAMPLE}
			state="done"
			activity={notVerifiedActivity}
			artifacts={unverifiedArtifact}
			onRun={noop}
			onReset={noop}
			onLoadSample={noop}
		/>
	</div>
</Story>

<Story name="Stopped early" asChild>
	<div class="max-w-md bg-background p-6">
		<DirectDeliveryWallet
			value={'{ not json'}
			state="done"
			activity={stoppedEarlyActivity}
			onRun={noop}
			onReset={noop}
			onLoadSample={noop}
		/>
	</div>
</Story>

<Story name="Error" asChild>
	<div class="max-w-md bg-background p-6">
		<DirectDeliveryWallet
			value={SAMPLE}
			state="error"
			onRun={noop}
			onReset={noop}
			onLoadSample={noop}
		/>
	</div>
</Story>

<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import type { WalletActivityEntry, WalletArtifact } from './test-wallet-types.js';
	import TestWallet from './TestWallet.svelte';

	const { Story } = defineMeta({
		title: 'Interop/Test Wallet/TestWallet',
		component: TestWallet
	});

	const noop = () => {};

	// Shared VCALM-flavoured mock copy (the base itself hard-codes no protocol strings).
	const copy = {
		inputLabel: 'Interaction URL',
		inputPlaceholder: 'https://issuer.example/exchanges/…',
		inputType: 'url' as const,
		actionLabel: 'Run interaction',
		runningLabel: 'Running interaction…',
		againLabel: 'Run again'
	};

	const URL = 'https://issuer.example/exchanges/ex-1';

	const runningActivity: WalletActivityEntry[] = [
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

	const verifiedActivity: WalletActivityEntry[] = [
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

	const notVerifiedActivity: WalletActivityEntry[] = [
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

	const stoppedEarlyActivity: WalletActivityEntry[] = [
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

{#snippet cryptosuiteSettings()}
	<label class="block space-y-1">
		<span class="text-label-md text-muted-foreground">Holder cryptosuite</span>
		<select
			class="h-9 w-full rounded-md border border-border bg-card px-3 text-body-md text-foreground"
		>
			<option value="eddsa-rdfc-2022">eddsa-rdfc-2022 (Ed25519)</option>
			<option value="ecdsa-rdfc-2019">ecdsa-rdfc-2019 (P-256)</option>
		</select>
	</label>
{/snippet}

{#snippet intro()}
	The test wallet participates as the holder — fetching the exchange, authenticating with a DID, and
	receiving the credential — then records each interaction and verification below.
{/snippet}

<!-- Idle, empty, with settings. Toggle the Storybook theme to check light + dark. -->
<Story name="Idle — with settings" asChild>
	<div class="max-w-md bg-background p-6">
		<TestWallet
			{...copy}
			state="idle"
			{intro}
			settings={cryptosuiteSettings}
			onRun={noop}
			onReset={noop}
		/>
	</div>
</Story>

<!-- Paste variant shape: no settings section rendered. -->
<Story name="Idle — without settings" asChild>
	<div class="max-w-md bg-background p-6">
		<TestWallet
			inputLabel="Delivered credential"
			inputPlaceholder="Paste a Verifiable Credential (JSON)…"
			inputType="text"
			actionLabel="Verify credential"
			state="idle"
			onRun={noop}
			onReset={noop}
		/>
	</div>
</Story>

<Story name="Running" asChild>
	<div class="max-w-md bg-background p-6">
		<TestWallet
			{...copy}
			value={URL}
			state="running"
			busy
			activity={runningActivity}
			settings={cryptosuiteSettings}
			onRun={noop}
			onReset={noop}
		/>
	</div>
</Story>

<Story name="Done — verified with artifact" asChild>
	<div class="max-w-md bg-background p-6">
		<TestWallet
			{...copy}
			value={URL}
			state="done"
			activity={verifiedActivity}
			artifacts={verifiedArtifact}
			settings={cryptosuiteSettings}
			onRun={noop}
			onReset={noop}
		/>
	</div>
</Story>

<Story name="Done — not verified" asChild>
	<div class="max-w-md bg-background p-6">
		<TestWallet
			{...copy}
			value={URL}
			state="done"
			activity={notVerifiedActivity}
			artifacts={unverifiedArtifact}
			settings={cryptosuiteSettings}
			onRun={noop}
			onReset={noop}
		/>
	</div>
</Story>

<Story name="Stopped early" asChild>
	<div class="max-w-md bg-background p-6">
		<TestWallet
			{...copy}
			value={URL}
			state="done"
			activity={stoppedEarlyActivity}
			settings={cryptosuiteSettings}
			onRun={noop}
			onReset={noop}
		/>
	</div>
</Story>

<Story name="Error" asChild>
	<div class="max-w-md bg-background p-6">
		<TestWallet
			{...copy}
			value={URL}
			state="error"
			settings={cryptosuiteSettings}
			onRun={noop}
			onReset={noop}
		/>
	</div>
</Story>

<script lang="ts">
	import type { WalletActivity, WalletArtifact } from '$lib/interop/wallet-activity.js';

	import type { TestWalletState } from '../test-wallet-types.js';
	import TestWallet from '../TestWallet.svelte';

	type HolderCryptosuite = 'eddsa-rdfc-2022' | 'ecdsa-rdfc-2019';

	/**
	 * VCALM issuer-flow variant of {@link TestWallet}: the wallet participates as the holder —
	 * fetching the exchange, authenticating with a DID, and receiving the credential. A thin
	 * composition wrapper — it supplies the VCALM semantic copy and a "Holder cryptosuite"
	 * settings select, and forwards the run data (`activity`/`artifacts`) and lifecycle
	 * (`value`/`busy`/`onRun`/`onReset`) props. No protocol logic or fetching lives here; the
	 * page drives the run and passes results in as props.
	 */
	let {
		value = $bindable(''),
		cryptosuite = $bindable<HolderCryptosuite>('eddsa-rdfc-2022'),
		state = 'idle',
		busy = false,
		canRun = true,
		activity = [],
		artifacts = [],
		onRun,
		onReset
	}: {
		/** Bindable interaction URL. */
		value?: string;
		/** Bindable holder cryptosuite selection. */
		cryptosuite?: HolderCryptosuite;
		state?: TestWalletState;
		busy?: boolean;
		canRun?: boolean;
		activity?: WalletActivity[];
		artifacts?: WalletArtifact[];
		onRun?: () => void | Promise<void>;
		onReset?: () => void;
	} = $props();
</script>

{#snippet intro()}
	The test wallet participates as the holder — fetching the exchange, authenticating with a DID, and
	receiving the credential — then records each interaction and verification below.
{/snippet}

{#snippet settings()}
	<label class="block space-y-1">
		<span class="text-label-md text-muted-foreground">Holder cryptosuite</span>
		<select
			bind:value={cryptosuite}
			disabled={busy}
			class="h-9 w-full rounded-md border border-border bg-card px-3 text-body-md text-foreground"
		>
			<option value="eddsa-rdfc-2022">eddsa-rdfc-2022 (Ed25519)</option>
			<option value="ecdsa-rdfc-2019">ecdsa-rdfc-2019 (P-256)</option>
		</select>
	</label>
{/snippet}

<TestWallet
	walletName="Test wallet"
	inputLabel="Interaction URL"
	inputType="url"
	inputPlaceholder="https://issuer.example/exchanges/…"
	actionLabel="Run interaction"
	runningLabel="Running interaction…"
	againLabel="Run again"
	bind:value
	{state}
	{busy}
	{canRun}
	{activity}
	{artifacts}
	{intro}
	{settings}
	{onRun}
	{onReset}
/>

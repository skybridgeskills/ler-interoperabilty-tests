<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import type { WalletActivity, WalletArtifact } from '$lib/interop/wallet-activity.js';

	import type { TestWalletState } from '../test-wallet-types.js';
	import TestWallet from '../TestWallet.svelte';

	/**
	 * Direct-delivery (OB3 paste-and-verify) variant of {@link TestWallet}: the suite's built-in
	 * verifier receives a delivered credential and runs verifier-core + conformance checks. Unlike
	 * the issuer-flow variants the initiation input is a multiline textarea (the whole credential
	 * JSON) with a "Load sample" secondary action, and there is **no** wallet-settings section (no
	 * holder cryptosuite for paste). Additive-profile selection is intentionally NOT duplicated
	 * here — it stays in the page's `AdditiveChecklistSection`.
	 */
	let {
		value = $bindable(''),
		state = 'idle',
		busy = false,
		canRun = true,
		activity = [],
		artifacts = [],
		onRun,
		onReset,
		onLoadSample
	}: {
		/** Bindable delivered-credential JSON. */
		value?: string;
		state?: TestWalletState;
		busy?: boolean;
		canRun?: boolean;
		activity?: WalletActivity[];
		artifacts?: WalletArtifact[];
		onRun?: () => void | Promise<void>;
		onReset?: () => void;
		/** Optional: fill the textarea with a sample credential. Omit to hide the action. */
		onLoadSample?: () => void;
	} = $props();
</script>

{#snippet intro()}
	Paste a delivered credential and the suite's built-in verifier runs its verifier-core and
	conformance checks — recording each verification below.
{/snippet}

{#snippet loadSample()}
	{#if onLoadSample}
		<Button type="button" variant="outline" onclick={() => onLoadSample?.()} disabled={busy}>
			Load sample
		</Button>
	{/if}
{/snippet}

<TestWallet
	walletName="Test wallet"
	inputLabel="Delivered credential (JSON)"
	inputType="text"
	multiline
	inputPlaceholder="Paste a Verifiable Credential (JSON), or load a sample…"
	actionLabel="Verify credential"
	runningLabel="Verifying…"
	againLabel="Verify again"
	bind:value
	{state}
	{busy}
	{canRun}
	{activity}
	{artifacts}
	{intro}
	secondaryActions={loadSample}
	{onRun}
	{onReset}
/>

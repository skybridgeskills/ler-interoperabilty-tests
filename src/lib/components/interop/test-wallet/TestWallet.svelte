<script lang="ts">
	import type { TestWalletProps } from './test-wallet-types.js';
	import WalletActivityList from './wallet-activity-list/WalletActivityList.svelte';
	import WalletArtifactCard from './wallet-artifact-card/WalletArtifactCard.svelte';
	import WalletHeader from './wallet-header/WalletHeader.svelte';
	import WalletInitiationForm from './wallet-initiation-form/WalletInitiationForm.svelte';
	import WalletSettings from './wallet-settings/WalletSettings.svelte';

	/**
	 * Purely presentational "test wallet" panel, styled as a stripped-down digital wallet:
	 * header (identity + live/idle chip) → primary initiation action → separated wallet
	 * settings → produced-credential artifacts → ordered activity/messages list. Every label
	 * and the settings contents are parametrized via props/snippets — no protocol strings or
	 * data fetching live here. The container keeps the orange `live` runtime surface. The
	 * overall pass/fail verdict is intentionally NOT rendered here (see P3's RunResultCard).
	 */
	let {
		walletName = 'Test wallet',
		state = 'idle',
		inputLabel,
		inputPlaceholder,
		inputType = 'text',
		multiline = false,
		value = $bindable(''),
		actionLabel,
		runningLabel,
		againLabel,
		busy = false,
		canRun = true,
		activity = [],
		artifacts = [],
		intro,
		settings,
		secondaryActions,
		emptyActivity,
		onRun,
		onReset
	}: TestWalletProps = $props();
</script>

<section class="space-y-4 rounded-md border border-live-border bg-live-soft p-5">
	<WalletHeader {walletName} {state} />

	{#if intro}
		<div class="text-body-md text-foreground">{@render intro()}</div>
	{/if}

	<WalletInitiationForm
		{inputLabel}
		{inputPlaceholder}
		{inputType}
		{multiline}
		bind:value
		{actionLabel}
		{runningLabel}
		{againLabel}
		{state}
		{busy}
		{canRun}
		{secondaryActions}
		{onRun}
		{onReset}
	/>

	<WalletSettings {settings} />

	{#if artifacts.length > 0}
		<section class="space-y-2 border-t border-live-border/60 pt-4">
			<p class="text-label-md text-muted-foreground uppercase">Credentials</p>
			<div class="space-y-2">
				{#each artifacts as artifact (artifact.title)}
					<WalletArtifactCard {artifact} />
				{/each}
			</div>
		</section>
	{/if}

	<section class="space-y-2 border-t border-live-border/60 pt-4">
		<p class="text-label-md text-muted-foreground uppercase">Activity</p>
		<WalletActivityList {activity} {emptyActivity} />
	</section>
</section>

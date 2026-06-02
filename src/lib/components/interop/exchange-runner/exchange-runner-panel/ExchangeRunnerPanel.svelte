<script lang="ts">
	import { InteractionQrCard } from '$lib/components/interop/exchange-runner/interaction-qr-card/index.js';
	import { ProtocolSelector } from '$lib/components/interop/exchange-runner/protocol-selector/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	import type {
		ExchangeRunnerActions,
		ExchangeRunnerPanelData
	} from './exchange-runner-panel-types.js';

	let {
		data,
		actions,
		initiateLabel = 'Initiate exchange',
		busyLabel = 'Creating exchange…'
	}: {
		data: ExchangeRunnerPanelData;
		actions: ExchangeRunnerActions;
		initiateLabel?: string;
		busyLabel?: string;
	} = $props();

	let busy = $state(false);

	const selectedProtocol = $derived(data.selectedProtocol ?? 'vcalm');
	const activeUrl = $derived(
		selectedProtocol === 'oid4vci' ? data.oid4vciDeepLink : data.interactionUrl
	);
	const headerLabel = $derived(
		selectedProtocol === 'oid4vci' ? 'Live · OID4VCI offer' : 'Live · interaction URL'
	);

	async function initiate() {
		if (busy) return;
		busy = true;
		try {
			await actions.onInitiate();
		} finally {
			busy = false;
		}
	}

	async function retry() {
		if (busy) return;
		busy = true;
		try {
			await (actions.onRetry ?? actions.onInitiate)();
		} finally {
			busy = false;
		}
	}
</script>

<aside class="space-y-6">
	{#if data.run === 'idle'}
		<div class="space-y-3 rounded-md border border-live-border bg-live-soft p-5">
			<p class="text-label-md text-live">Live test runner</p>
			<h3 class="text-headline-md text-foreground">Initiate an issuance exchange</h3>
			<p class="text-body-md text-foreground">
				Spin up a real VC-API exchange against the local DCC transaction service. We'll generate a
				QR code for the wallet under test to scan.
			</p>
			<Button
				type="button"
				class="bg-live text-live-foreground hover:bg-live/90"
				disabled={busy}
				onclick={initiate}
			>
				{busy ? busyLabel : initiateLabel}
			</Button>
		</div>
	{:else if data.run === 'error'}
		<div class="space-y-3 rounded-md border border-destructive bg-destructive/10 p-5">
			<p class="text-label-md text-destructive">Exchange failed</p>
			<p class="text-body-md text-foreground">
				{data.error?.message ?? 'The exchange could not be completed.'}
			</p>
			{#if data.error?.hint}
				<p class="text-body-md text-muted-foreground">{data.error.hint}</p>
			{/if}
			<Button type="button" variant="outline" disabled={busy} onclick={retry}>
				{busy ? busyLabel : 'Retry'}
			</Button>
		</div>
	{:else if data.run === 'complete'}
		<div class="space-y-3 rounded-md border border-primary/40 bg-primary/5 p-5">
			<p class="text-label-md text-primary">Exchange complete</p>
			<p class="text-body-md text-foreground">
				The wallet successfully received and verified the issued credential.
			</p>
			{#if data.exchangeId}
				<p class="text-label-md font-mono text-muted-foreground">exchange · {data.exchangeId}</p>
			{/if}
			{#if actions.onReset}
				<Button type="button" variant="outline" onclick={() => void actions.onReset?.()}>
					Run again
				</Button>
			{/if}
		</div>
	{:else if data.interactionUrl}
		<ProtocolSelector
			oid4vciAvailable={!!data.oid4vciDeepLink}
			value={selectedProtocol}
			onChange={(next) => actions.onSelectProtocol?.(next)}
		/>
		{#if activeUrl}
			<InteractionQrCard interactionUrl={activeUrl} {headerLabel} />
		{/if}
		{#if data.exchangeId}
			<p class="text-label-md font-mono text-muted-foreground">exchange · {data.exchangeId}</p>
		{/if}
	{/if}
</aside>

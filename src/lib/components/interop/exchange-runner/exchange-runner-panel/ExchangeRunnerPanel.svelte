<script lang="ts">
	import { InteractionQrCard } from '$lib/components/interop/exchange-runner/interaction-qr-card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	import type {
		ExchangeProtocolId,
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

	// Copy is panel-owned: call sites pass `intent` + `protocol`, never strings.
	const HEADER_LABEL: Record<ExchangeProtocolId, string> = {
		vcalm: 'Live · interaction URL',
		oid4vci: 'Live · OID4VCI offer',
		oid4vp: 'Live · OID4VP request'
	};

	const IDLE_COPY = {
		issuance: {
			heading: 'Initiate an issuance exchange',
			body: "Spin up a real VC-API exchange against the local DCC transaction service. We'll generate a QR code for the wallet under test to scan."
		},
		verification: {
			heading: 'Initiate a verification exchange',
			body: "Spin up a real VC-API exchange against the local DCC transaction service. We'll generate a QR code for the wallet under test to present a credential."
		}
	} as const;

	const COMPLETE_BODY = {
		issuance: 'The wallet successfully received and verified the issued credential.',
		verification: 'The wallet successfully presented a credential, and we verified it.'
	} as const;

	const copy = $derived({
		headerLabel: HEADER_LABEL[data.protocol],
		idle: IDLE_COPY[data.intent],
		completeBody: COMPLETE_BODY[data.intent]
	});

	let busy = $state(false);

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
			<h3 class="text-headline-md text-foreground">{copy.idle.heading}</h3>
			<p class="text-body-md text-foreground">{copy.idle.body}</p>
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
			<p class="text-body-md text-foreground">{copy.completeBody}</p>
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
		<InteractionQrCard interactionUrl={data.interactionUrl} headerLabel={copy.headerLabel} />
		{#if data.exchangeId}
			<p class="text-label-md font-mono text-muted-foreground">exchange · {data.exchangeId}</p>
		{/if}
	{/if}
</aside>

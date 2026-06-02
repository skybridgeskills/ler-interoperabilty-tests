# Phase 3 — Wire panel + storybook coverage

## Scope

Plug the selector into `ExchangeRunnerPanel` and update the QR card
to drop the "Open in browser" affordance + flip its header label by
protocol. Add storybook variants for VCALM, OID4VCI, and
legacy-no-OID4VCI states.

## Code organization

- `ExchangeRunnerPanelData` gains `oid4vciDeepLink?: string` and
  `selectedProtocol?: 'vcalm' | 'oid4vci'`.
- `ExchangeRunnerActions` gains `onSelectProtocol?: (next) => void`.
- Panel decides which URL to pass to `InteractionQrCard` based on
  `selectedProtocol`.
- `InteractionQrCard` accepts an optional `headerLabel?: string` prop
  (default keeps the existing `Live · interaction URL`); also drops
  the "Open in browser" link.
- Storybook variants live alongside the existing stories.

## Implementation details

### `exchange-runner-panel-types.ts`

```ts
import type { ChecklistRunState, StepRunState } from '$lib/interop/index.js';

export type ExchangeProtocolId = 'vcalm' | 'oid4vci';

export type ExchangeRunnerPanelData = {
	run: ChecklistRunState;
	perStep: StepRunState[];
	interactionUrl?: string;
	oid4vciDeepLink?: string;
	selectedProtocol?: ExchangeProtocolId;
	exchangeId?: string;
	error?: { message: string; hint?: string };
};

export type ExchangeRunnerActions = {
	onInitiate: () => void | Promise<void>;
	onRetry?: () => void | Promise<void>;
	onReset?: () => void | Promise<void>;
	onSelectProtocol?: (next: ExchangeProtocolId) => void;
};
```

### `ExchangeRunnerPanel.svelte`

```svelte
<script lang="ts">
	import { ProtocolSelector } from '$lib/components/interop/exchange-runner/protocol-selector/index.js';
	// ... existing imports

	let {
		data,
		actions,
		initiateLabel = 'Initiate exchange',
		busyLabel = 'Creating exchange…'
	} = $props();
	// … existing prop type intersection (omitted)

	const selected = $derived(data.selectedProtocol ?? 'vcalm');
	const activeUrl = $derived(selected === 'oid4vci' ? data.oid4vciDeepLink : data.interactionUrl);
	const headerLabel = $derived(
		selected === 'oid4vci' ? 'Live · OID4VCI offer' : 'Live · interaction URL'
	);
	// … existing busy / initiate / retry handlers
</script>

{#if data.run === 'awaiting-wallet' || data.run === 'wallet-connected'}
	<div class="space-y-4">
		{#if data.interactionUrl}
			<ProtocolSelector
				oid4vciAvailable={!!data.oid4vciDeepLink}
				value={selected}
				onChange={(next) => actions.onSelectProtocol?.(next)}
			/>
		{/if}
		{#if activeUrl}
			<InteractionQrCard interactionUrl={activeUrl} {headerLabel} />
		{/if}
		{#if data.exchangeId}
			<p class="text-label-md font-mono text-muted-foreground">exchange · {data.exchangeId}</p>
		{/if}
	</div>
{:else if data.run === 'idle'}
	<!-- existing CTA card; copy update mentions both protocols -->
{:else if data.run === 'complete'}
	<!-- existing complete card -->
{:else if data.run === 'error'}
	<!-- existing error card -->
{/if}
```

The exact branching keeps the existing structure; only the
`awaiting-wallet` / `wallet-connected` arm gains the selector +
header-label switch. The idle CTA copy is updated from
"Spin up a real VC-API exchange…" to mention both protocols are
offered:

> _"Spin up a real VC-API exchange against the local DCC transaction
> service. The wallet under test can pick between VCALM Exchanges and
> OID4VCI Pre-Authorized Code Flow."_

### `InteractionQrCard.svelte` updates

- Add optional `headerLabel?: string` prop; default
  `'Live · interaction URL'`.
- Remove the "Open in browser" link block.
- Keep QR + read-only input + copy button.

### Storybook updates

`ExchangeRunnerPanel.stories.svelte` — three new variants:

- `Awaiting wallet — VCALM` (current behaviour but with both URLs
  in `data` so the selector shows).
- `Awaiting wallet — OID4VCI` (both URLs, `selectedProtocol:
'oid4vci'`).
- `Awaiting wallet — VCALM only (legacy container)` (only
  `interactionUrl`, `oid4vciDeepLink: undefined`; selector hidden).

Existing variants (`Idle`, `Wallet connected`, `Complete`, `Error`)
remain; `Wallet connected` gains an OID4VCI sibling under the same
"both protocols available" pattern.

`InteractionQrCard.stories.svelte` — add a variant with the OID4VCI
URL + `headerLabel="Live · OID4VCI offer"`.

## Validate

```
pnpm turbo check
pnpm turbo test
pnpm turbo storybook   # eyeball the new variants in light + dark
```

`check` and `test` must pass; the storybook eyeball is manual.

## Suggested commit

```
feat(exchange-runner): wire ProtocolSelector into panel; update QR card
```

# Phase 4 — Wallet-acceptance page wiring

## Scope

`RunnableWalletAcceptancePage` learns about both URLs and the
selected protocol, defaulting to VCALM and persisting user choice in
component state for the lifetime of the run.

- Track `selectedProtocol: 'vcalm' | 'oid4vci'` in Svelte state,
  defaulting to `'vcalm'`.
- After the create-exchange call, set both `interactionUrl` and
  `oid4vciDeepLink` from `data.protocols.iu` and
  `data.protocols.OID4VCI`.
- On reset, clear both URLs and the selection back to `'vcalm'`.
- Pass `onSelectProtocol` through to `ExchangeRunnerPanel.actions`.

## Code organization

Single Svelte file edit:
`src/lib/pages/runnable-wallet-acceptance/RunnableWalletAcceptancePage.svelte`.

## Implementation details

```svelte
<script lang="ts">
	// existing imports …
	import type { ExchangeProtocolId } from '$lib/components/interop/exchange-runner/exchange-runner-panel/exchange-runner-panel-types.js';

	// existing state:
	let exchangeId = $state<string | undefined>(undefined);
	let interactionUrl = $state<string | undefined>(undefined);

	// new state:
	let oid4vciDeepLink = $state<string | undefined>(undefined);
	let selectedProtocol = $state<ExchangeProtocolId>('vcalm');

	type CreateExchangeBody = {
		exchangeId: string;
		protocols: { iu: string; vcapi: string; lcw?: string; OID4VCI?: string };
	};

	function setIdle() {
		// existing resets …
		exchangeId = undefined;
		interactionUrl = undefined;
		oid4vciDeepLink = undefined;
		selectedProtocol = 'vcalm';
		// existing reset of runState / perStep / pollHandle …
	}

	async function initiate() {
		// existing create call …
		const data = (await res.json()) as CreateExchangeBody;
		exchangeId = data.exchangeId;
		interactionUrl = data.protocols.iu;
		oid4vciDeepLink = data.protocols.OID4VCI;
		// existing run-state transitions …
	}

	const panelData = $derived({
		run: runState,
		perStep,
		interactionUrl,
		oid4vciDeepLink,
		selectedProtocol,
		exchangeId,
		error: runnerError
	});
</script>

<RunnableChecklist …>
	{#snippet rightColumn()}
		<ExchangeRunnerPanel
			data={panelData}
			actions={{
				onInitiate: initiate,
				onRetry: initiate,
				onReset: setIdle,
				onSelectProtocol: (next) => {
					selectedProtocol = next;
				}
			}}
		/>
	{/snippet}
</RunnableChecklist>
```

No new tests are required at the page level — the panel's storybook
variants exercise the wiring with mock data; the page itself is a
thin shim around already-tested machinery. (The existing
`page.svelte.spec.ts` for the home page is unaffected.)

## Validate

```
pnpm turbo check
pnpm turbo test
pnpm turbo build
```

All green. Manual smoke (with `pnpm dev` and mock state):

- Open `/wallet/credential-acceptance/vcalm-eddsa`. Click
  "Initiate exchange". The right column shows the protocol selector
  (because the fake emits `OID4VCI`). Toggle between tabs and verify
  the QR + URL re-render. Click reset; selection returns to VCALM,
  both URLs clear.

## Suggested commit

```
feat(runner): wallet-acceptance page surfaces OID4VCI protocol option
```

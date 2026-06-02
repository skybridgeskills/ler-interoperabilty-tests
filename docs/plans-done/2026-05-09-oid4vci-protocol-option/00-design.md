# Design: OID4VCI Protocol Option (suite side)

## Scope of work

Wire the suite UI to the new `OID4VCI` field on the
dcc-transaction-service protocols response. When the connected
service offers both VCALM and OID4VCI for a `claim` exchange, the
runner's right column lets the developer toggle between the two and
shows the correct QR + copy URL for the chosen protocol.

End-to-end docker testing is deferred (the pinned image predates the
service-side OID4VCI work). All testing in this plan goes through the
in-memory fake.

## File structure

```
ler-interoperability-test-suite/
├── docs/plans/2026-05-09-oid4vci-protocol-option/
│   ├── 00-notes.md                                      # done
│   ├── 00-design.md                                     # this file
│   ├── 01-schema-and-client.md                          # NEW
│   ├── 02-protocol-selector-component.md                # NEW
│   ├── 03-panel-and-storybook.md                        # NEW
│   ├── 04-wallet-acceptance-page.md                     # NEW
│   └── 05-cleanup-and-validation.md                     # NEW
├── docker/
│   └── README.md                                        # UPDATE: digest-bump procedure
├── src/lib/
│   ├── server/domain/exchange-runner/
│   │   ├── transaction-service-client.ts                # UPDATE: add `OID4VCI?` to ExchangeProtocols
│   │   ├── transaction-service-client.test.ts           # UPDATE: assert real-client passes through `OID4VCI`
│   │   ├── fake-transaction-service-client.ts           # UPDATE: emit OID4VCI deep link in mock
│   │   └── fake-transaction-service-client.test.ts      # UPDATE: assert OID4VCI shape
│   ├── components/interop/exchange-runner/
│   │   ├── protocol-selector/                           # NEW
│   │   │   ├── ProtocolSelector.svelte
│   │   │   ├── ProtocolSelector.stories.svelte
│   │   │   └── index.ts
│   │   ├── exchange-runner-panel/
│   │   │   ├── exchange-runner-panel-types.ts           # UPDATE: add oid4vciDeepLink + selected
│   │   │   ├── ExchangeRunnerPanel.svelte               # UPDATE: render selector + correct URL
│   │   │   └── ExchangeRunnerPanel.stories.svelte       # UPDATE: 3 new variants (VCALM/OID4VCI/legacy)
│   │   ├── interaction-qr-card/
│   │   │   ├── InteractionQrCard.svelte                 # UPDATE: configurable header label; drop "open in browser"
│   │   │   └── InteractionQrCard.stories.svelte         # UPDATE: variant with OID4VCI deep link
│   │   └── index.ts                                     # UPDATE: re-export ProtocolSelector
│   └── pages/runnable-wallet-acceptance/
│       └── RunnableWalletAcceptancePage.svelte          # UPDATE: pass OID4VCI through; selector state; reset on new exchange
└── src/routes/api/exchange-runner/create/+server.ts     # no change — passes the typed result through
```

## Conceptual architecture

```
┌─ Server (unchanged auth path) ─────────────────────────────────────┐
│  POST /api/exchange-runner/create                                  │
│      → TransactionServiceClient.createExchange()                   │
│      → returns { exchangeId, protocols: { iu, vcapi, lcw?,         │
│                                            verifiablePresentationRequest, │
│                                            OID4VCI? } }            │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─ Browser ──────────────────────────────────────────────────────────┐
│  RunnableWalletAcceptancePage                                       │
│    state: { interactionUrl?, oid4vciDeepLink?,                      │
│             selectedProtocol: 'vcalm' | 'oid4vci' }                 │
│    on initiate → set both URL fields from response                  │
│    on protocol change → setSelectedProtocol(...)                    │
│                                                                     │
│  RunnableChecklist                                                  │
│    └─ ExchangeRunnerPanel  (right column)                           │
│         ├─ ProtocolSelector  (renders only if both URLs present)    │
│         │    Tabs: VCALM | OID4VCI                                  │
│         └─ InteractionQrCard                                        │
│              url:    selected === 'oid4vci'                         │
│                      ? oid4vciDeepLink                              │
│                      : interactionUrl                               │
│              header: 'Live · interaction URL' / 'Live · OID4VCI offer'│
└─────────────────────────────────────────────────────────────────────┘
```

### Schema delta

```ts
export const ExchangeProtocols = ZodFactory(
	z.object({
		iu: z.string().url(),
		vcapi: z.string().url(),
		lcw: z.string().url().optional(),
		/**
		 * OID4VCI 1.0 deep link of the form
		 * `openid-credential-offer://?credential_offer_uri=...`. Present only
		 * when the connected transaction-service version supports OID4VCI;
		 * absent for older containers — the panel falls back to VCALM-only.
		 */
		OID4VCI: z.string().optional(),
		verifiablePresentationRequest: VerifiablePresentationRequest.schema
	})
);
```

`OID4VCI` is intentionally a plain `z.string()` (not `.url()`) because
`openid-credential-offer://` is a non-https URI scheme that some
implementations of `z.string().url()` reject.

### Panel data shape

```ts
export type ExchangeRunnerPanelData = {
	run: ChecklistRunState;
	perStep: StepRunState[];
	interactionUrl?: string; // VCALM `iu`
	oid4vciDeepLink?: string; // OID4VCI `openid-credential-offer://...`
	selectedProtocol?: 'vcalm' | 'oid4vci';
	exchangeId?: string;
	error?: { message: string; hint?: string };
};

export type ExchangeRunnerActions = {
	onInitiate: () => void | Promise<void>;
	onRetry?: () => void | Promise<void>;
	onReset?: () => void | Promise<void>;
	onSelectProtocol?: (protocol: 'vcalm' | 'oid4vci') => void;
};
```

### Selector component

```ts
// ProtocolSelector.svelte (sketch)
let {
	protocols, // { vcalm: string; oid4vci?: string }
	value, // 'vcalm' | 'oid4vci'
	onChange // (next) => void
}: {
	protocols: { vcalm: string; oid4vci?: string };
	value: 'vcalm' | 'oid4vci';
	onChange: (next: 'vcalm' | 'oid4vci') => void;
} = $props();
```

When `protocols.oid4vci` is `undefined`, the component renders
nothing (the parent doesn't have to special-case the absence; this
keeps the seam simple).

### Graceful degradation

If `protocols.OID4VCI` is absent in the response (older container):

- `RunnableWalletAcceptancePage` doesn't set `oid4vciDeepLink`.
- `ExchangeRunnerPanelData.oid4vciDeepLink` is `undefined`.
- `ProtocolSelector` renders nothing.
- The QR card uses `interactionUrl` (the existing default).

A test variant pins this exact state — the storybook story
`Awaiting wallet — VCALM only (legacy container)` exercises it.

### Fake client mock URL

The fake's `createExchange` extends its return shape:

```ts
OID4VCI: `openid-credential-offer://?credential_offer_uri=${encodeURIComponent(
	`${host}/workflows/claim/exchanges/${exchangeId}/openid/credential-offer`
)}`;
```

so storybook + tests can exercise the full UI without a live service.

## Style conventions

- Factory functions, not classes.
- `ZodFactory` for any new wire-shape; `OID4VCI?: z.string().optional()`
  is the only new field.
- Domain-first layout: server schemas under
  `src/lib/server/domain/exchange-runner/`; UI under
  `src/lib/components/interop/exchange-runner/`.
- File size ≤ ~200 lines (the panel is already at ~95; selector
  adds ~40).
- All `<Story>` blocks use `asChild`.
- TSDoc on every public schema + provider; non-obvious helpers get
  a one-liner.
- No new singletons; all state stays page-local in the existing Svelte
  5 runes.

## Acceptance criteria

- The fake's `createExchange` returns `protocols.OID4VCI` set to a
  parseable `openid-credential-offer://?credential_offer_uri=…` URL.
- `ProtocolSelector` renders a `Tabs` toggle when both URLs are
  present; renders nothing when `oid4vci` is `undefined`.
- `ExchangeRunnerPanel` chooses the right URL for the QR card based
  on `selectedProtocol`.
- `RunnableWalletAcceptancePage` defaults to `selectedProtocol =
'vcalm'` and stores user choice in component state.
- Storybook stories cover three variants (VCALM-active,
  OID4VCI-active, legacy/no-OID4VCI) plus the existing four states
  (idle / awaiting / connected / complete / error).
- `pnpm turbo validate` passes.
- `docker/README.md` documents the digest-bump procedure.

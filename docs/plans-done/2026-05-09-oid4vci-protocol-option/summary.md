# 2026-05-09 — OID4VCI Protocol Option (suite side): Summary

## What shipped

The wallet-acceptance × VCALM-EdDSA runner now offers OID4VCI
Pre-Authorized Code Flow as a second wallet entry-point alongside
VCALM. A small Tabs-style protocol selector swaps the QR + copy URL
in the right column.

End-to-end docker testing is still deferred: the pinned
`dcc-transaction-service` digest predates the OID4VCI work that just
shipped on the service side. The suite drives all of it through the
in-memory fake; `docker/README.md` documents the digest-bump
procedure for whoever cuts the next service image.

### Schema + client

- `ExchangeProtocols` (zod schema in
  `src/lib/server/domain/exchange-runner/transaction-service-client.ts`)
  gains an optional `OID4VCI?: string` field. The wire field key
  follows the OID4VCI 1.0 spec name and the prior sveltekit spike's
  convention; `z.string()` is used (not `.url()`) because
  `openid-credential-offer://` is a custom URI scheme.
- The fake client emits a real-shaped
  `openid-credential-offer://?credential_offer_uri=…` deep link.
- `transaction-service-client.test.ts` covers both the populated and
  the omitted-field paths.

### Selector primitive

- New `ProtocolSelector` under
  `src/lib/components/interop/exchange-runner/protocol-selector/`.
  Built on shadcn-svelte `Tabs`. Takes `oid4vciAvailable: boolean`,
  `value: 'vcalm' | 'oid4vci'`, `onChange`. Renders nothing when the
  flag is false so callers don't have to special-case the legacy
  path.
- Three storybook variants (`Both protocols available`,
  `OID4VCI initially selected`, `VCALM only (legacy container)`).

### Panel + storybook

- `ExchangeRunnerPanelData` gains `oid4vciDeepLink?` and
  `selectedProtocol?: 'vcalm' | 'oid4vci'`.
- `ExchangeRunnerActions` gains `onSelectProtocol?`.
- The panel renders `<ProtocolSelector>` whenever both URLs are
  present and routes the QR to the URL matching the selected tab.
  The card's header label switches between
  `Live · interaction URL` (VCALM) and `Live · OID4VCI offer`
  (OID4VCI) via the new `headerLabel?` prop on `InteractionQrCard`.
- Storybook gains six new variants: `Awaiting wallet — VCALM`,
  `Awaiting wallet — OID4VCI`, `Awaiting wallet — VCALM only
(legacy container)`, `Wallet connected — VCALM`,
  `Wallet connected — OID4VCI`, plus a new `OID4VCI offer` story
  on `InteractionQrCard`.

### Page wiring

- `RunnableWalletAcceptancePage.svelte` tracks `oid4vciDeepLink` and
  `selectedProtocol` in component state, defaults to `'vcalm'`,
  pulls `data.protocols.OID4VCI` after the create call, and clears
  both URLs + selection on reset. `onSelectProtocol` writes through
  to the same state.

### Documentation

- `docker/README.md` gets a new "Bumping the dcc-transaction-service
  image" H2 with the procedure (pull → inspect digest → update
  compose → restart → curl-jq the new field) for whoever publishes
  the next service image.

## Validation

`pnpm turbo validate` passes:

- prettier ✓
- eslint ✓
- typescript / svelte-check ✓
- vitest (server + client + storybook): 130 tests, 37 files ✓
- production build with all 10 prerendered checklist routes intact
  - the runnable wallet-acceptance route still served at runtime ✓

## Out of scope (future)

- Bumping the dcc-transaction-service digest in
  `docker/compose.dev.yml`. Waits on a published image with the
  service-side OID4VCI work.
- End-to-end docker walk against the real service (e.g. an
  integration test that boots a fresh container and exercises the
  OID4VCI flow).
- A separate runner page for `oid4-ecdsa` profile.
- Browser-side state-machine differentiation between the two
  protocols.
- "Copy as cURL" affordance.

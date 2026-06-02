# 2026-05-09 — OID4VCI Protocol Option (suite side)

## Scope of work

Wire the suite's runnable wallet-acceptance page up to the new
`OID4VCI` field that the dcc-transaction-service now emits on the
protocols object for `claim` exchanges. The wire field is **uppercase**
(`OID4VCI`) to match the spec name and the prior sveltekit spike's
convention; internal TS identifiers stay camelCase.

When the user clicks "Initiate exchange" on
`/wallet/credential-acceptance/vcalm-eddsa`, the same exchange now
exposes **two** wallet entry-points side by side: the existing VCALM
`iu` interaction URL **and** an OID4VCI 1.0
`openid-credential-offer://?credential_offer_uri=...` deep link. The
right column gains a small protocol selector so the developer can
choose which one their wallet under test consumes, with the QR + copy
URL re-rendering for the chosen protocol.

End-to-end docker testing is **not** in scope: the transaction-service
container we currently pin doesn't yet include the OID4VCI work that
just shipped on the service side. We test the suite's end via the
in-memory fake (which we extend in this plan) and document the digest
bump as a follow-up.

### In scope

- Add `OID4VCI?: string` to the `ExchangeProtocols` schema in
  `src/lib/server/domain/exchange-runner/transaction-service-client.ts`.
- Pass it through the real client + the in-memory fake; surface it on
  `CreateExchangeResult.protocols`.
- Surface it on `ExchangeRunnerPanel`'s data shape so the right
  column can render either deep link.
- Add a protocol-selector UI primitive — a small `Tabs`-style toggle
  between **VCALM Exchanges** (default, current behavior) and
  **OID4VCI · Pre-Authorized**.
- Render the appropriate URL in the existing `InteractionQrCard` for
  whichever protocol is selected. Both QRs are encoded the same way;
  the OID4VCI link uses the `openid-credential-offer://` custom URL
  scheme (no fallback "open in browser").
- Storybook stories cover three states with both protocols visible:
  `Awaiting wallet — VCALM`, `Awaiting wallet — OID4VCI`,
  `Awaiting wallet — VCALM only (older container, no OID4VCI)`.
- Graceful degradation when the connected service doesn't return
  `OID4VCI`: the selector simply doesn't render, and we fall back to
  the existing VCALM-only experience.

### Out of scope (deferred to a follow-up)

- Bumping the pinned `dcc-transaction-service` digest in
  `docker/compose.dev.yml` (waits on a published image). Document
  the process; do not attempt the bump in this plan.
- End-to-end docker walk against the real service.
- A separate runner page for `oid4-ecdsa` profile (different content
  module entry; same protocol mechanics). The selector here lives on
  `wallet-acceptance × vcalm-eddsa` only because that's where the
  runner exists.
- Browser-side state machine differences between the two protocols
  (today both use `pollExchange` against the same `getExchange`
  endpoint, which is what the service emits regardless of protocol).
- A "copy as cURL" affordance.

## Current state of the suite

Relevant pieces shipped in the prior `exchange-runner` plan:

- `src/lib/server/domain/exchange-runner/transaction-service-client.ts`
  — `ExchangeProtocols = ZodFactory(z.object({ iu, vcapi, lcw?,
verifiablePresentationRequest }))`. No `OID4VCI`.
- `…/fake-transaction-service-client.ts` — returns mock
  `{ iu, vcapi, lcw, verifiablePresentationRequest }`. No `oid4vci`.
- `src/lib/components/interop/exchange-runner/exchange-runner-panel/`
  — `ExchangeRunnerPanelData.interactionUrl?: string`. The panel
  renders `<InteractionQrCard interactionUrl={data.interactionUrl} />`
  unconditionally for awaiting / connected states.
- `src/lib/pages/runnable-wallet-acceptance/RunnableWalletAcceptancePage.svelte`
  — sets `interactionUrl = data.protocols.iu` after the create call.
- `src/lib/components/interop/exchange-runner/interaction-qr-card/InteractionQrCard.svelte`
  — renders QR + copy. Hardcodes language about "interaction URL" but
  is otherwise protocol-agnostic.

The transaction-service repo just shipped an `OID4VCI` field on
`getProtocols()` that surfaces a deep link of the form
`openid-credential-offer://?credential_offer_uri=…/openid/credential-offer`.
Once a fresh image is published with that change, our existing pinned
digest can be bumped and the field will start arriving in the
response.

## Style conventions for this plan

Drawn from `docs/style/`. Highlights:

- **Factory functions, not classes.**
- **`ZodFactory`** for any wire-shape addition.
- **Domain-first layout.** Server schemas under
  `src/lib/server/domain/exchange-runner/`. UI components under
  `src/lib/components/interop/exchange-runner/`.
- **File size ≤ ~200 lines.** Split if the panel grows.
- **`asChild` on every `<Story>`** that includes custom layout markup.
- **Storybook stories** for every reusable component variant.
- **Tests** co-located as `*.test.ts`.

## Acceptance criteria

- The fake transaction-service client returns `protocols.OID4VCI` set
  to a parseable `openid-credential-offer://?credential_offer_uri=…`
  URL.
- `ExchangeRunnerPanelData` carries an optional `oid4vciDeepLink:
string` alongside `interactionUrl` so the panel renders either.
- When both URLs are present, the right column shows a Tabs-style
  protocol selector. Selecting **OID4VCI** swaps the QR and the
  text-input value to the deep link.
- When `protocols.OID4VCI` is absent, the panel renders identically
  to today's behavior (no selector, VCALM URL only). No regression.
- Storybook page-level story for the runner has three new variants:
  `Awaiting wallet — VCALM`, `Awaiting wallet — OID4VCI`,
  `Awaiting wallet — VCALM only (legacy container)`.
- `pnpm turbo validate` passes.

## Questions

### Q1. Plan scoping & phasing

**Suggested course forward:** one plan, five phases.

1. **Schema + client + fake** — extend `ExchangeProtocols`, fake mock,
   `CreateExchangeResult` plumbing. Tests pass.
2. **Protocol selector primitive** — small `ProtocolSelector` Svelte
   component built on shadcn-svelte `Tabs` (already in the project).
3. **Wire panel + page** — extend
   `ExchangeRunnerPanelData` with `oid4viDeepLink?`, conditional
   selector render, storybook variants.
4. **Wallet-acceptance page** — pass `protocols.OID4VCI` through to
   the panel; minor copy update to mention both protocol options on
   the idle CTA.
5. **Cleanup + validate** — `pnpm turbo validate`, summary, move
   plan to `docs/plans-done/`.

### Q2. Selector UI primitive

The protocol selector lives **inside the right-column live panel** on
the runner page (above the QR card). What component renders it?

- (a) shadcn-svelte `Tabs` with two triggers — most familiar,
  vertically stacked, larger click targets.
- (b) shadcn-svelte `RadioGroup` — semantically a single-select
  control; takes more vertical room.
- (c) Custom inline `<button>` toggle (segmented control look).

**Suggested course forward:** (a) `Tabs`. We already have it
generated in `src/lib/components/ui/tabs/`. The protocol "tabs" map
naturally to alternative panes of the same content (different QR /
URL pair).

### Q3. Component name + location

**Suggested course forward:** `ProtocolSelector` under
`src/lib/components/interop/exchange-runner/protocol-selector/`. It
takes a typed `protocols: { vcalm: string; oid4vci?: string }` plus a
`value` + `onChange`, and emits the same shape's keys
(`'vcalm' | 'oid4vci'`). When `oid4vci` is `undefined`, the component
renders nothing (the parent handles the no-selector path; this keeps
the selector's output predictable when it does render).

### Q4. Naming for the user-visible labels

**Suggested course forward:**

- **VCALM Exchanges** — short label `VCALM`. Tooltip / sub-label:
  "VC-API exchange (default)".
- **OID4VCI · Pre-Authorized** — short label `OID4VCI`. Tooltip /
  sub-label: "Pre-authorized code flow".

### Q5. OID4VCI deep link copy / UX in `InteractionQrCard`

The card today includes a small "Open in browser" affordance that
makes sense for the VCALM `iu` URL (https). The OID4VCI URL uses the
`openid-credential-offer://` custom scheme — clicking it from a
browser tries to launch a registered handler and won't open in a tab.

**Suggested course forward:** drop the "Open in browser" link entirely
from the card. The two affordances we keep (QR + copy) work for both
schemes. The header line on the card switches its label based on
which protocol is active — `Live · interaction URL` (VCALM) →
`Live · OID4VCI offer` (OID4VCI).

### Q6. Test approach

**Suggested course forward:**

- Update `fake-transaction-service-client.test.ts` to assert the new
  `OID4VCI` URL shape.
- New unit tests on `ProtocolSelector` (renders / hides correctly).
- New storybook variants (auto-tested under the storybook Vitest
  project).
- No new client/integration tests against the real service — that
  needs the freshly-built image. Document the manual smoke test for
  whoever bumps the digest.

## Notes

### Resolved answers

- **Q1 — Plan shape:** one plan, five phases as outlined above.
- **Q2 — Selector UI:** shadcn-svelte `Tabs` (already in
  `src/lib/components/ui/tabs/`).
- **Q3 — Component name + location:** `ProtocolSelector` under
  `src/lib/components/interop/exchange-runner/protocol-selector/`.
  Renders nothing when `oid4vci` is `undefined`; parent unconditionally
  passes the same shape and the component decides.
- **Q4 — Labels:** trigger labels `VCALM` and `OID4VCI`; sub-labels
  "VC-API exchange (default)" and "Pre-authorized code flow".
- **Q5 — QR card UX:** drop the "Open in browser" affordance entirely.
  Header label flips between `Live · interaction URL` (VCALM) and
  `Live · OID4VCI offer` (OID4VCI).
- **Q6 — Tests:** unit + storybook; no real-service integration in
  this plan (deferred until digest bump).
- **Q-followup — Digest bump:** deferred. Document the procedure in
  `docker/README.md`.

### Process for bumping the digest (deferred follow-up)

When the new transaction-service image is published with the OID4VCI
work:

```sh
docker pull skybridgeskills/dcc-transaction-service:<new-tag>
docker inspect skybridgeskills/dcc-transaction-service:<new-tag> \
  --format '{{index .RepoDigests 0}}'
# Update the `image:` line in docker/compose.dev.yml with the
# returned digest. Restart with `pnpm dev:services:down && pnpm
# dev:services` to verify the new field shows up:
curl -fsS http://localhost:4004/workflows/claim/exchanges/<id>/protocols \
  | jq .protocols.OID4VCI
```

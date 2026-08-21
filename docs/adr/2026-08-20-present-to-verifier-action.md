# The `present-to-verifier` action + operator-runtime-input step model

- Status: accepted
- Date: 2026-08-20
- Context: M10a — migrating the live VCALM verifier page onto the
  scenario model. The direct-delivery verifier page migrated in M10
  (`ob3-direct-verifier-acceptance`); the two **live** verifier pages
  (oid4, vcalm) run a real present-to-verifier wire loop the existing
  action union could not express.

## Context

Every `ScenarioAction` before this one is **suite-initiated** over a
catalog-resolved input:

- `issue` / `request-presentation` mint an exchange through the
  transaction service;
- `deliver-direct` signs a file the suite mints.

The live verifier flow is the inverse. The **operator's own verifier**
drives: it issues a presentation request (a VC-API interaction URL), and
the suite responds as **holder** — signing a credential and submitting it
to the verifier's exchange. Two things follow that no prior action needed:

1. **A new interaction shape** — operator-initiated, suite-as-holder. The
   suite does not start the exchange; it joins one that lives on the
   operator's system.
2. **An operator-supplied runtime input** — the interaction URL. Every
   prior action references only catalog ids (recipe / request) resolved
   server-side; this is the first action whose input is a value the
   operator types **at run time**, per run, and cannot be authored.

## Decision

**A `present-to-verifier` action, plus a client-side step-driver that
carries the operator's runtime input — the pure run-state model gains only
evidence fields.**

```ts
{ kind: 'present-to-verifier', credential: RecipeId, transport: 'vcalm', tamper? }
```

- **The action** names the credential (a recipe) and the transport. The
  suite is the holder — the inverse of `request-presentation`, documented
  on the schema. `transport` is the seam OID4VP slots into (M10b ships
  `'oid4vp'`); M10a ships `'vcalm'` only. `tamper` corrupts the credential
  after signing, exactly as `deliver-direct` does.

- **Runtime input is a client concern, not a run-state change.** The pure
  model already drives actions from the controller and settles with
  `StepEvidence`. A new `present-step.ts` (sibling of `direct-step.ts`)
  exposes `present(interactionUrl)` rather than running on construction; a
  `PresentField` paste component collects the URL, and the controller holds
  its busy / miss-note / retry state. The run-state model gains **only** two
  client-safe evidence fields on `StepEvidence` —
  `verifierRequest: VerifierRequestSummary` and `verifierPresent` — which
  the floor/delivery `automatic` checks read. No new "the operator provides
  X before this action runs" concept enters the pure engine.

- **A transport miss is evidence, not an error.** A verifier that rejects
  the submission returns `verifierPresent.submitted: false`; the step stays
  in-flight and the operator pastes a fresh URL and re-presents. Only a
  blank / non-URL input is a 400 (`PresentInputError`). VC-API exchanges
  are single-use, so every present is a fresh URL — no reuse toggle (unlike
  OID4VP, M10b).

- **A shared, leaf present module.** The holder-side present primitive
  lives in `server/domain/verifier-present/` — it signs a recipe credential
  (fresh ephemeral did:key issuer + holder, optional post-signing tamper),
  drives the existing `VcalmVerifierFlowDriver` (already shared in
  `wallet-client`), and returns a **client-safe** `{ request, present }`
  summary. Neither `scenario-runner` nor the legacy `verifier-runner`
  imports the other's domain; the module is a leaf both can depend on, the
  `credential-tamper` precedent. `scenarioRunner.present` wires it (real:
  `WalletCrypto` + HTTP transport + `probeTls`; fake: a deterministic
  summary), behind `POST /api/scenario-runner/present`.

## Consequences

- The action union stays the single reviewed escape hatch: a genuinely new
  interaction shape is one new `kind`, not a bespoke page that forks the
  result shape.
- The floor/delivery wire checks become pure functions over a client-safe
  evidence summary (P3), so they carry no server types into `interop/` and
  a stored run needs no live exchange to render.
- OID4VP (M10b) reuses the machinery: add `transport: 'oid4vp'`, a second
  present primitive (inspect + `direct_post`), and its own summary builder.
  The action shape, the step-driver, the paste-field pattern, and the
  evidence fields are unchanged.
- SSRF surface is inherited from the existing verifier-flow transport (the
  server fetches an operator-supplied host) — an accepted trade-off for a
  local developer testing tool, unchanged here.

## Alternatives considered

- **A bespoke runnable page** (the shape the pre-scenario oid4/vcalm pages
  took). Rejected: it forks the result shape and the scoring path the whole
  scenario model exists to unify.
- **A "request" catalog entry** the action references by id. Rejected: the
  interaction URL is per-run operator data, not authorable content — an id
  cannot stand in for a value minted by the operator's verifier at run time.
- **A deep run-state change** — a first-class "operator provides X before
  this action" phase in the pure engine. Rejected as unnecessary: the
  discovery pass found the input is a client-driver concern; the pure model
  only needs to carry the resulting evidence.

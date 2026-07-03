# Additive execution in the wallet-runner exchange flows

- Status: accepted
- Date: 2026-07-03
- Context: Additive-profile application cleanup (P5) — running selected additives on the VCALM/OID4 issuer exchange flows

## Context

The paste runner (`POST /api/issuer-runner/verify`) already evaluates selected
additive profiles against a pasted credential: it walks each selected additive's
`issuer × direct-credential-issuance` checklist and dispatches every requirement
`id` to the shared issuer-runner `checkRegistry`, emitting a `kind: 'additive'`
group in the `IssuerRunnerReport`.

The runnable **exchange** flows (VCALM `POST /api/wallet-runner/issuer-vcalm/run`,
OID4 `POST /api/wallet-runner/issuer-oid4/run`) drove the test wallet through the
protocol and evaluated only the **base** `issuer × credential-issuance` checklist
via `runIssuerFlowChecks`, emitting a single `base` group. A selected additive
(e.g. Open Skill Alignment) was visible and selectable on those pages (P3/P4) but
was never actually run against the exchange-delivered credential — pain point 4
of the cleanup.

OSA's check functions are workflow-agnostic: they read only the credential
payload (`credentialSubject.result[]` / `achievement.resultDescription[]`) and
are already registered in the shared `checkRegistry` keyed by requirement `id`.
The exchange flows already expose the delivered credential at
`ctx.delivery?.credential`.

## Decision

`runIssuerFlowChecks` gains optional additive evaluation. When called with
`additiveProfiles` + a `toCredentialCtx` adapter, for each **selected** additive
that declares an `issuer × credential-issuance` checklist (resolved through the
existing `additiveChecklistsForCombination`, see the matching-model ADR) it:

1. Adapts the flow observations into the credential `CheckCtx` via
   `toCredentialCtx(ctx)`, forcing `includeAdditive: true` (the group is only
   built for a specifically-selected additive; the legacy gate is redundant but
   preserved for the OSA checks).
2. Walks the additive checklist's requirements and dispatches each `id` to the
   **same shared issuer-runner `checkRegistry`** used by the paste runner — no
   forked or exchange-specific check logic.
3. Emits one `kind: 'additive'` group per selected additive alongside the `base`
   group, with `workflow: 'credential-issuance'`, `role: 'issuer'`.

The `toCredentialCtx` adapters are the existing `credCtx` helpers in
`vcalm-issuer-flow.ts` / `oid4-issuer-flow.ts`, now exported from the
wallet-runner barrel as `vcalmCredentialCtx` / `oid4CredentialCtx`.

Aggregation and reporting:

- **`verified` spans all groups.** A failing selected-additive MUST flips the
  whole run to not-verified, matching the paste runner's `CheckRunner`. The
  endpoints compute `failingMustCount` across `report.groups` (base + additive),
  so a failing OSA MUST is reflected in the run-history record.
- **Additive outcomes are a separate channel.** The endpoints return
  `additiveOutcomes` (flattened) alongside the base `outcomes`; the base
  `outcomes` list stays base-only so the runnable page's left-column checklist
  mapping is unchanged. The runnable pages map `additiveOutcomes` by `id` into
  the `AdditiveChecklistSection` requirement rows for live pass/fail/warn/na
  status.
- **No credential yet → pending.** When no credential has been delivered
  (`toCredentialCtx(ctx).credential === undefined`), additive evaluation is
  skipped entirely and the additive requirements stay pending — matching the
  base flow's step-not-run convention.

## Consequences

- The exchange flows reach parity with the paste runner for additive execution
  with no duplicated check logic — the same `checkRegistry` functions serve
  paste, VCALM, and OID4.
- The additive-execution seam is **generic**: any selected additive whose
  requirement ids are registered is evaluated, not just OSA. (This phase's DoD
  and tests target OSA; DI additive execution semantics are out of scope.)
- The report shape (`base` + `additive` groups) is now the shared vocabulary for
  both runners, so downstream consumers (run-history, report rendering) treat
  paste and exchange results uniformly.
- Adding additive execution to a future exchange flow (e.g. verifier-side)
  requires only a `toCredentialCtx` adapter for that flow's observations.

## Alternatives considered

- **Merge additive outcomes into the base `outcomes` list.** Rejected: the
  runnable page maps `outcomes` positionally onto the base checklist's
  left-column steps; mixing additive ids in would break that mapping and lose
  the base/additive distinction the report already models. A separate
  `additiveOutcomes` channel plus the `additive` report group keeps both.
- **Fork exchange-specific additive checks.** Rejected: OSA checks are
  credential-payload-only and already registered; forking would duplicate logic
  and risk drift from the paste runner.
- **Gate additive execution on the legacy `includeAdditive` flag alone.**
  Rejected: `includeAdditive` predates per-additive selection (true when _any_
  additive is selected). Group-level inclusion keyed on the specific selected
  additive is precise; the flag is forced on only for back-compat with the OSA
  checks that still read it.

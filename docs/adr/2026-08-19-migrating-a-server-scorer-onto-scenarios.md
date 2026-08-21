# Migrating a server scorer onto scenarios: absorb attestation, defer wire checks

- Status: accepted
- Date: 2026-08-19
- Context: M10 — the first of three page-family migrations onto the
  `Scenario` model (verifier, then issuer M11, then wallet M12). Each
  family's runnable pages are scored by a server engine whose emitted
  outcome ids are hardcoded (`ChecklistRequirement.id`); the migration
  has to re-home those onto scenario `Requirement.id`s. This ADR fixes
  the pattern the later two follow.

## Context

A scenario `Requirement` is decided one of two ways: `attested` (the
operator answers a concealed-then-revealed quiz question, scored by the
generic `scoreAttestedAnswer`) or `automatic` (a **pure client-side
function over `RunEvidence`** — a suite-minted `RunnerExchangeView` —
resolved by `checkId`). The verifier engine is neither: it runs
**server-side** and scores over the operator's pasted request and the
suite's own submission, producing per-row outcomes with `source:
'attested' | 'automated'`.

Two different things hide inside "the scorer", and they migrate very
differently:

1. **Attestation-shaped scoring** — comparing the operator's reported
   verdict/reason against concealed ground truth. This _is_ the scenario
   attested model already; the engine was an earlier, bespoke spelling
   of it.
2. **Genuine server-side wire checks** — inspecting a pasted protocol
   request (TLS, request format, query matchability) or a live
   submission. These have no evidence source in the scenario model and
   are substantive, not the "small escape hatch" `automatic` is framed
   as.

## Decision

**Absorb attestation; defer wire checks.**

- **Attestation-shaped scoring is absorbed** into the scenario attested
  model — no adapter, and no server scorer retained for it. In M10 the
  verifier acceptance passes (verdict + reason vs `PassKind`) became
  `choose` requirements scored by the generic scorer; the acceptance
  scorer runs for the migrated page no longer.

- **Genuine wire checks are staged out when large**, rather than
  inflating the migration. M10 migrated only the direct-delivery page —
  which has _no_ wire checks — and **deferred** the oid4/vcalm live
  present-to-verifier flow and its floor/delivery `automated` rows to a
  child effort (planning issue 10), because expressing them needs a new
  `ScenarioAction` kind, a request-inspection evidence source, and the
  checks ported into the check registry. The old engine stays standing
  and keeps serving the un-migrated pages until that child effort lands.

- **`deliver-direct` is now runner-drivable.** It was a declared action
  kind the runner refused; M10 wired it (sign one recipe locally with an
  ephemeral did:key issuer, offer it for download, settle with
  artifact-only evidence) and gave it a `tamper` field, under the
  action-union extension policy of
  `2026-08-13-scenario-as-runnable-unit.md`. Post-signing tamper lives in
  a neutral shared `credential-tamper` module so no domain reaches into
  another's.

## Consequences

- **The migration completes without a parallel scoring path.** A
  migrated page's acceptance is scored by the one generic scorer; the
  only server code left is the wire-check engine for pages not yet
  migrated.
- **M11 and M12 inherit the split.** Issuer and wallet each have the
  same two ingredients; the expectation is the same — absorb the
  attested/observed grading into requirements, and stage any heavy
  server-side observation behind its own plan rather than forcing it into
  the migration milestone.
- **A staged migration means a temporary standing engine.** Between M10
  and the child effort, the verifier engine serves oid4/vcalm while the
  scenario model serves direct delivery — two code paths for one role,
  by design, self-liquidating when the child effort and M13 land.
- **No `warn`, no `n/a`.** The two engine statuses with no scenario
  equivalent are re-homed by construction: `warn` becomes a SHOULD
  requirement, and `n/a`/unmeasurable rows are dropped rather than
  carried (see the M10 amendment to the verifier assessment ADR).

## Alternatives considered

- **Wrap the server scorer behind an `automatic` check.** Rejected: it
  would keep the bespoke scorer alive indefinitely and make `automatic`
  mean "arbitrary server call", eroding the guarantee that a check is a
  pure function over evidence.
- **Migrate the whole verifier family at once (all three pages).**
  Rejected: it forces the large present-to-verifier action + floor-check
  port into M10, when only the direct page is expressible today. Staging
  keeps each milestone shippable and puts the hard, reviewable work
  behind its own plan.
- **Fake the oid4/vcalm pages as `deliver-direct`** (hand a file instead
  of running the live protocol). Rejected: an "oid4" test that never
  touches OID4VP misrepresents what was verified — the same "don't record
  a lie" principle the whole model rests on.

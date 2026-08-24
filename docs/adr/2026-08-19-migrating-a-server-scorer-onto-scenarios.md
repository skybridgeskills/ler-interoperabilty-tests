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

## Update 2026-08-20 (M10a — the deferred wire-check half lands, for VCALM)

M10a migrates the **VCALM** verifier page, and with it the "deferred
half" this ADR named: the automated **floor + delivery** wire checks the
`automatic`-check registry did not yet cover. The reconciliation this ADR
proposed is now realised for VCALM (OID4 follows in M10b):

- **The floor/delivery rows are now scenario `automatic` checks.** The
  six VCALM wire checks (`vcalm-interaction-endpoint`, `-vpr-query`,
  `-vpr-didauth`, `-request-tls`, `-response-tls`, `-response-endpoint`)
  are pure functions over a **client-safe** request/present evidence
  summary the `present-to-verifier` step produces — ported 1:1 from
  `verifier-runner/vcalm` (`vpr-checks.ts` / `score-delivered-run.ts`).
  No bespoke scorer, and `automatic` still means "a pure function over
  evidence": the server produces the summary, the check reads it.

- **Two scenarios, not one.** The wire measurement (floor + delivery) and
  the discrimination measurement (verdict/reason) are **separated** into
  `vcalm-verifier-delivery` (pure-automatic — the catalog's first) and
  `vcalm-verifier-acceptance` (attested, mirroring M10's direct scenario).
  A scenario is one measurement; cramming the floor into the
  discrimination run would conflate two. The delivery scenario presents a
  **valid control**, so its delivery row is scored without leaking any
  concealed acceptance verdict.

- **`warn`/`n/a` re-homed exactly as this ADR predicted.** The VCALM floor
  was already pure pass/fail; the engine's `n/a` (intake-failure) rows,
  which have no automatic equivalent, resolve to **fail** rather than being
  carried.

- **The standing engine shrinks but does not vanish yet.** The VCALM
  verifier **route** is deleted (no redirect). The VCALM verifier-runner
  engine, its API routes, and the legacy page component still stand,
  because the shared `VerifierRunner` also serves OID4 and the page
  component is M13's to remove — so the actual engine deletion is bundled
  into M13 with the other legacy page components and the dynamic route,
  rather than risking OID4 in M10a. The reusable holder-side present
  primitive moved to a new shared leaf, `server/domain/verifier-present/`,
  which OID4 (M10b) reuses.

## Amendment (2026-08-20, M10b — the OID4 half landed)

The deferred wire-check half is now landed for **both** protocols.
`oid4-verifier-delivery` (pure-automatic floor + delivery) and
`oid4-verifier-acceptance` (attested discrimination) mirror the VCALM pair, with
the OID4 floor's genuine soft branches resolved at authoring (see the
`present-to-verifier` ADR's M10b amendment: di-vp-format MUST/only-JWT-fails,
request-tls SHOULD/inline⇒met, nonce dropped). With both live verifier pages
migrated, **`verifier-runner` is now fully dead code** — the standing VCALM +
OID4 engines, their API routes, and the two legacy page components are swept
together in M13. M10b, like M10a, deleted only the **route** (no redirect); it did
not touch the shared engine.

## Amendment (2026-08-21, M11 — the issuer family, third and last)

The issuer family is migrated. It is the pattern's hardest case and it needed no
new axis, which is the point of recording it here rather than in a second ADR.

**Two engines, not one.** Discovery found the milestone's true surface was
roughly twice its brief's file list: the paste page is scored by `issuer-runner`
(`checkRegistry` → `CheckRunner`), while the two live pages are scored by a
_different_ engine, `wallet-runner/issuer-flow-check.ts`, which is a **shared
cluster** with the M12 wallet pages exactly as M10a found for the verifier. The
shape of the answer was unchanged: absorb attestation, port the wire checks, put
the reusable primitive in a leaf that imports neither engine.

**Absorb attestation.** Seven of the direct page's thirteen rows were hardcoded
`n/a`. Two — `delivery.downloadable-file` and `delivery.copy-paste-text` — are
observations of the run the operator just performed, so they became **attested
affirms and now gate**, where as `n/a` MUSTs they gated nothing. The other five
are standing properties of the operator's platform (`auth.secure-login`,
`auth.verify-identity`), a row needing a revocation probe the suite does not run,
or restatements of the two survivors; they are **dropped**. That is the line this
ADR draws, stated sharply: _attested re-homes an observation of the run just
performed; a standing property, or a row needing a probe we do not run, is
dropped._ The same line dropped `vcalm.*.participation-problemdetails` and
`…didauth-problemdetails`.

**Port the wire checks.** Six VCALM and eight OID4VCI checks are now pure
functions over a client-safe `IssuerFlowSummary` produced by a new shared leaf,
`server/domain/issuer-receive/` — the mirror image of `verifier-present/`, and
likewise independent of both standing engines. The two live intakes add **no
protocol code**: they wrap the existing `wallet-client/drivers/*-issuer-flow`
drivers and project their observations.

**The payload checks are transport-independent, and that is where the leverage
was.** The received credential rides `StepEvidence.artifact`, not the wire
summary, so one `credential-*` family (plus one `osa-*` family) serves the paste,
VCALM and OID4VCI alike. **58 engine rows became 33 checks**, 11 of them shared.

**`warn`/`n/a` resolved at authoring, as this ADR requires.** Four `warn`
branches became fails (`subject-id-is-email` on a bare email, `di-vp-signing-algs`
with no bundle alg, `didauth-requested` on a challenge without a
`DIDAuthentication` query, `ctdl-alignment` off-allowlist or absent) and
`valid-until` absent became a SHOULD fail on all three. The OSA `n/a`s split two
ways, and the distinction is worth keeping: an **upstream-missing** passthrough
resolves to **fail** (the upstream `.present` MUST has already failed, and a green
row beside a red one misreads), while a rule with **nothing to apply to** — no
`Percent` rows to bound, no rubric results to level-check — resolves to a
**vacuous pass**, because nothing violates it.

**One de-duplication.** `oid4.*.tls` and `oid4.*.tls-credential` dispatched to the
same function over the same probed host; two ids for one fact is a duplicate, not
coverage, so they are one check whose message names all three endpoints.

**Both issuer engines are now dead code**, joining `verifier-runner` in M13's
sweep — though `wallet-runner` still serves the three **wallet** pages until M12.
M11 deleted only the three **routes** (no redirect), the same line M10a and M10b
held.

## Amendment (2026-08-22, M12 — the wallet family, fourth and genuinely last)

The M11 amendment above called itself "third and last". It was third; it was not last. The three
wallet pages remained, and M12 migrated them. Four families, four migrations — the pattern is now
closed, and this is the amendment that closes it.

**The pattern held, and the wallet family was the cheapest of the four.** The reason is worth
recording because it is structural rather than lucky: here the suite is the **verifier**, so the
evidence _is_ the exchange record. The transaction service folds verifier-core's result into
`variables.results.default`, `GET /api/exchange-runner/[exchangeId]` already returns `variables` to
the client, and the black-box model reads exactly that. So unlike `verifier-present/` and
`issuer-receive/`, this migration needed **no new `ScenarioAction` kind, no server leaf, and no new
evidence slot** — the checks are the scorer's own functions, moved. Where the suite is the party
under observation's counterparty, there is nothing to project.

**`warn`/`n/a` resolved at authoring, as this ADR requires.** The six dispositions are recorded in
M12's [`mapping.md`](../../.skybridge/planning/ler-interoperability-tests/2026-08-11-scenario-architecture/12-migrate-wallet-pages/mapping.md) §3,
and M11's distinction is preserved intact: a rule with **nothing to apply to** passes vacuously
(`key-type-matches` on a non-`did:key` holder), while a rule whose input is missing **because
something upstream failed** fails.

**One correction to the engine, not the scorer.** A terminal `invalid` exchange was being treated as
a _harness_ failure by the scenario runner, while the legacy page scored it. That was the wrong
side of the line this ADR draws: settling on any terminal state is what makes a non-verifying VP a
**failed requirement** rather than an unrecordable run. `onFailed` now means only what it should —
create failed, poll errored, window timed out — because those alone leave nothing honest to record.
The same fix closed the same latent hole on the claim side.

**The whole `wallet-runner` cluster is now dead**, joining `verifier-runner` and the two issuer
engines. All four families are migrated and the engine deletions are one sweep, M13's.

**The route rule, stated once for all four milestones:** _redirect iff the route carries documented
attach links; otherwise delete outright._ M6 and M12 redirect (their routes parse `?exchangeId=`);
M10a, M10b and M11 deleted (theirs carried none). That is one rule consistently applied, not two
policies — a distinction worth making explicitly, because the surface reads like an inconsistency
until you know what decides it.

## Amendment (2026-08-22, M13 — the engines are deleted)

The four migrations this ADR records left `issuer-runner`, `wallet-runner` and
`verifier-runner` scoring nothing reachable. M13 deleted all three, their API
routes, the eight runnable page components, `profile.checklists` and the whole
checklist type family — the parallel surface is gone, and the catalog is the only
statement of what this suite measures.

Five earlier ADRs describe those engines. **None is superseded**: their rules are
what the ported checks implement, so each carries a dated note pointing here
rather than a status change. An ADR whose reasoning still holds but whose code
has moved is not a reversed decision, and marking it superseded would lose the
reasoning that explains the checks.

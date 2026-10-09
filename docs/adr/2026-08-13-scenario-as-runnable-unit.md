# Scenario as the runnable unit

- Status: accepted
- Date: 2026-08-13
- Supersedes: [2026-06-10 Additive-checklist matching model](./2026-06-10-additive-checklist-matching-model.md)
- Context: Scenario architecture M1 — the domain model, before any runner, store
  or page consumes it

## Context

The suite's runnable unit has been the combination `(role, workflow, profile)`. Each combination
resolved a `WorkflowChecklist` off `Profile.checklists`, and a bespoke page under
`src/lib/pages/runnable-*/` drove it. Additive profiles layered extra requirements in by matching
`appliesToBaseProfiles` against `(role, workflow)`.

That model does not survive contact with what the suite is now for. Live probing established two
things it cannot express:

1. **A wallet can behave perfectly and communicate terribly, and no wire-level test can tell.**
   When a wallet is offered a tampered or expired credential over VCALM, delivery _succeeds_ — the
   VC-API POST returns 200 and the exchange reaches `terminal: complete`. The wallet refuses it
   privately, after our last observation point, leaving no trace on the wire. The same wallet
   returned a byte-identical generic error for four different situations, naming a false cause in
   three of them. Measuring this requires asking the operator, and scoring the answer.
2. **The interesting tests are small, subtle and numerous** — expired, not-yet-valid, tampered
   proof, tampered claim, rich content, and so on. One bespoke page per test does not scale, and
   the catalog needs to reach dozens of entries.

"Workflow" was also already overloaded three ways: the six-way `WorkflowSlug` taxonomy, the
transaction service's `claim | verify` `workflowId`, and the loose sense of "a test we run". It
could not absorb a fourth meaning.

## Decision

**`Scenario` becomes the first-class runnable concept**, defined in
`src/lib/interop/scenarios/`. A scenario is one measurement: ordered steps, each with an optional
action and its own fine-grained requirements, each requirement either checked automatically from
the wire or attested by the operator through a scored quiz.

Specifically:

- **`Workflow` stays a six-way taxonomy and does not grow.** A scenario carries `workflow` for
  catalog grouping only; it never constrains what a step's action may do.
- **Requirements are scenario-local and cite nothing upward.** There is one requirement
  vocabulary in the app. `Requirement.level` is `MUST | SHOULD` only — a `MAY` gates nothing and
  cannot fail, so it contributes no arithmetic while forcing a third case on every consumer.
- **`ScenarioAction` is a closed union** — `issue`, `request-presentation`, `deliver-direct` —
  and **extending it is the only escape hatch**. If a scenario cannot be expressed, the fix is a
  new kind, reviewed once and reusable forever; never a bespoke page that forks the result shape.
- **The level belongs to the membership, not the scenario.** A scenario carries `memberships[]`,
  each `required | optional | { oneOf }`, exactly one naming a base profile. A profile — base or
  additive — is therefore a derived, named set of memberships, obtained by inverting the catalog
  rather than by storing a list on the profile. This replaces additive checklist matching.
- **`oneOf` is the producer-floor primitive** ("pass EdDSA _or_ ECDSA"). Consumer breadth is
  several `required` memberships in the additive instead, which keeps selective disclosure off the
  core floor. Members of a group **must declare identical requirement ids**, validated at catalog
  load, so the completion denominator cannot depend on which alternative was run.
- **Drift is a derived fingerprint, not a declared `version`.** `scenarioFingerprint()` hashes
  scoring-relevant content only — requirement ids, levels, statements, answer kinds, `choose`
  options and right answers, and step actions — and excludes cosmetic fields.
- **There is no scenario "type" field.** "Integration" versus "discrimination" is authoring
  vocabulary.
- **The catalog validates at module evaluation and throws**, naming every violation at once.

## Alternatives considered

**Grow `Workflow` into the runnable unit.** Rejected: it already carries three meanings, and a
fourth would make every reference ambiguous.

**Declare a `version: number` on each scenario.** Rejected because it fails _dishonestly_. An
author edits a right answer, forgets to bump, and a stored `passed` now claims a correct answer to
a question that changed. A derived fingerprint cannot be forgotten. The cost is that it also
changes on edits an author considers cosmetic — mitigated by excluding `name`, `blurb`, step
`title`, `summary` and `id` from the hash.

**Put the `required | optional` level on the scenario.** Rejected: the same scenario is genuinely
optional in one profile and required in another. "Accept an ECDSA credential over OID4" is
`optional` in `oid4` and `required` in `data-integrity-cryptosuites`. A level on the scenario
would force a duplicate scenario per level.

**Let scenarios cite profile requirement ids, for coverage reporting.** Rejected at charting: with
`Profile.checklists` being deleted there is nothing left to cite, and the join it would enable
(requirement-coverage reporting) is out of scope. Reuse, when its shape is visible, will be found
downward as shared step components — not by abstracting before the repetition exists.

**Enforce `choose.correct ∈ options` in the schema via `.refine`.** Rejected: it would throw on
the first bad scenario, defeating the "report every violation at once" property that makes a bad
catalog cheap to fix. It is a catalog rule instead.

## Consequences

- `Profile.checklists` and `AdditiveProfile.checklists` are on a deletion path. They remain live
  until every runnable page has migrated; deleting them is the completion criterion of the wider
  effort.
- Checklist requirement ids are currently hardcoded inside three server scoring engines (verifier
  `row-registry`/`resolve-rows`/`score-run`, issuer `check-runner` and its `checks/`, wallet
  `exchange-checker`/`issuer-flow-check`). Each must be re-homed onto scenario `Requirement.id`s
  as its pages migrate. This is the dominant cost of the migration.
- Changing a shipped requirement id, statement, level, answer shape or step action moves the
  fingerprint and therefore drops every stored result for that scenario. That is intended, and it
  is why cosmetic fields are excluded.
- A scenario names exactly one base profile, so a cross-profile scenario — issue over OID4VCI,
  request back over VCALM — cannot be expressed. None is wanted today; if one ever is, the shape
  has to change.
- `ScenarioSlug`, `RecipeId` and `RequestId` are validated strings rather than `z.enum`s, unlike
  the existing slug types. An enum maintained in lockstep with a catalog meant to reach dozens of
  entries would be pure duplication; uniqueness is a catalog rule instead.

## Amendment (2026-08-21, M11 — the action union grew a fourth kind)

`ScenarioAction` gained `receive-from-issuer`, under the extension policy this
ADR sets: a new kind is reviewed once and reusable forever, and is the designed
alternative to a bespoke page.

**What justified it.** All three issuer pages measure _the operator's issuer
producing a credential_. That is the inverse of `issue` — where the suite mints
for the operator's wallet — and no existing kind expressed it. The suite is the
**recipient**, so there is no recipe: the credential comes from the operator, not
from us. One kind with a `transport: 'direct' | 'vcalm' | 'oid4vci'` seam rather
than three kinds, mirroring what `present-to-verifier` did for the verifier side.
The operator's run-time input differs per transport (a credential JSON, a VC-API
interaction URL, an `openid-credential-offer://` URL) but that is one paste field
with different copy, not three actions.

**What it deliberately does not carry.** No `intent`. `IssuingIntent` belongs to
the actions where the _suite_ mints, and it resolves against the deployment's own
transaction-service tenant. In an issuer scenario the suite mints nothing: the
credential's cryptosuite is the operator's choice and is merely _observed_ in
`proof.cryptosuite`. The one crypto choice the suite does make is its own holder
key-proof suite, which `wallet-crypto` generates locally and can never be
unservable — so it is a plain `keyProofSuite` field, not an intent, and needs no
capability seam. The first genuinely pinned scenario is a **wallet** scenario
(M12). The field is named and documented to keep a future reader from wiring it
to `resolveIssuingContext`.

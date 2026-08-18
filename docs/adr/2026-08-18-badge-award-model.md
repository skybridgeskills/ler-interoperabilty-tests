# Badge award model

- Status: accepted
- Date: 2026-08-18
- Supersedes: none
- Context: Scenario architecture M8 — turning `[Claim badge]` into a real
  recognition credential claimed into a wallet, on top of the shipped scenario
  stack (M1–M7) and the completion meter (M4)

## Context

The completion meter fills exactly when a `(profile, role)` required set is
complete (`isClaimable`, [scenario run record and completion](./2026-08-13-scenario-run-record-and-completion.md)).
M8 makes the affordance beside it _do_ something: issue an Open Badges 3.0
recognition credential into the earner's wallet, from a template that shares
nothing with the test fixtures, at a `/badges/[slug]` page that also serves a
stranger arriving from `criteria.id`.

The mint machinery already exists — an issuance exchange through
`resolveIssuingContext` + `transactionServiceClient.createIssuanceExchange`
(M2). The questions M8 answers are about the _credential_ and the _claim_: whose
template, which id carries the version, whether claiming is a scenario, what a
claimed badge means once the catalog moves on, and where the `did:web` issuer
lives.

## Decision

**A recognition artifact with its own template and its own claim path, reusing
the mint seam but not the test-recipe registry.**

- **The badge template is a module apart from every test recipe**
  (`server/domain/badges/badge-recipe.ts`), and nothing imports one from the
  other. A badge is a plain OB3 — `@context` v2 + OB3 v3p0, `OpenBadgeCredential`,
  an `AchievementSubject`, a generated narrative — with **no** `evidence`,
  validity window, status list, revocation, or image.
- **A dedicated `POST /api/badges/[slug]/claim`** builds the per-award document
  and calls the shared mint seam. The create route, `create-bodies.ts`, the
  test-recipe registry, and `resolve-issuing-context.ts` are untouched. This is
  what keeps the two registries from ever importing each other, given the badge
  doc is per-award (`criteria.id?v=<fp>`, a generated narrative) while
  `CredentialRecipe.build({ credentialId })` takes no per-award data.
- **The version rides on `criteria.id`, not `achievement.id`.**
  `achievement.id = <root>/badges/<slug>` is stable; `criteria.id =
…?v=<fingerprint>` moves when the set's scoring content changes. The
  fingerprint composes the per-scenario `scenarioFingerprint`s through the same
  djb2 hash — the badge `?v=` and the scenario drift check are one mechanism.
- **`did:web` at the root domain is deployment configuration, not code.** The
  recipe sends an _object_ issuer carrying a throwaway `did:key:placeholder` id
  that the signing service **overwrites** from the tenant seed (it replaces the
  value, it does not inject one — so the placeholder must be present, exactly as
  the proven `minimal-ob3` recipe does); the recipe never names the real issuer,
  so the app stays issuer-agnostic. M8 builds and
  validates on the dev `did:key` tenant; the root-domain `did:web` issuer is a
  tracked ops task (set `TENANT_DID_URL_<TENANT>` on the signing service). The
  public origin the ids resolve to is `BADGE_ROOT_URL` (this app's own origin),
  defaulted to the dev origin.
- **Two tiers would be two badges; the base ships, the second is deferred.** The
  `(base profile, optional additive, role)` keying is built, but only
  `oid4-wallet` is registered — no optional/additive scenario exists yet, so
  `oid4-wallet-complete`'s set would be empty.
- **Claiming is not a scenario.** No catalog entry, no requirements, no quiz, no
  `ScenarioRunRecord`. The claim driver lives in `pages/badge/`, mints through
  the badge endpoint, and drives the exchange with `pollExchange(..., { stepCount:
1, workflow: 'claim' })`.
- **A claimed badge never un-earns; the meter is live and can drop.** A claim
  snapshot (`{badgeSlug, claimedAt, requirementIds[], fingerprint}`) persists in
  a **separate** `lits.badges.v1` store whose drift rule is the _inverse_ of the
  run store's: it never drops. That is what makes _"claimed 3 Aug against N
  requirements · k new since"_ sayable, where "k new since" is a **membership**
  diff, not a fingerprint compare. Both stores feed M9's `{ results, badges }`
  bundle; the snapshot's identity is `(badgeSlug, claimedAt)`.
- **A failed claim is not a test finding.** The receiving wallet is not the
  system under test. The UI offers a retry and diagnoses nothing; completion is
  untouched.
- **`isClaimable(result)` (M4) is the only claimability predicate.** The meter's
  fill, the completion group's affordance, and the badge page all call it; none
  re-derives `met === total`.

## Alternatives considered

**Reuse a test fixture as the badge credential.** Rejected. The test recipes and
a recognition badge have different audiences, lifetimes, and reasons to change,
and `build({ credentialId })` carries no per-award data. A shared template would
couple two registries the brief requires kept apart.

**Extend `/api/exchange-runner/create` with a badge-aware `issue` variant.**
Rejected: the create route would then import both the badge and the test-recipe
registries, muddying the "nothing may import one from the other" boundary. A
dedicated endpoint keeps them disjoint while still going through the same mint
seam.

**Hardcode a `did:web` issuer in the recipe, or block M8 on the `did:web`
hosting.** Rejected. The tenant seed stamps `issuer.id`, so the app code is
identical either way; naming an issuer in the recipe would be dead data the
signing service overwrites, and blocking M8's code on a hosting task (itself
gated on the pinned signing-service image honouring `TENANT_DID_URL`,
unverifiable from here) would stall the whole flow for a config flip.

**Version the `achievement.id`, or store historical badge definitions.**
Rejected as too much system. The goal is only that an old `criteria.id?v=` link
is not _bad_ — it renders the current criteria with a plain "older version"
note. Keeping historical definitions to say precisely what changed buys little
and costs a store.

**Ship a `tier` field with Bronze/Silver/Gold, or Core/Full, that no renderer
shows.** Rejected. Two tiers are two badges with two keys and two sets; a tier
enum on one badge would be decoration. The mechanism is built; the second badge
registers when an optional/additive scenario first exists.

**Make claiming a scenario.** Rejected as circular: a claim has no quiz, no right
answer, and no requirements — it is the _reward_ for a full set, not a
measurement. Recording a `ScenarioRunRecord` for it would pollute the meter it
depends on.

**Un-earn a claimed badge in the UI when the meter drops, or add a validity
window / revocation.** Rejected as theatre. The claim happened; the credential
is in a wallet and cannot be recalled. The live meter can drop, and the badge
page says how much is new since — but the claim stands.

**A section inside `lits.scenario-runs.v1` for claims.** Rejected: the run store
drops a record on drift and a claim must never drop. Two opposite drift rules in
one store is a bug waiting to happen, so claims get their own key.

**Frame a failed claim as a test finding.** Rejected. For a wallet badge the
receiving wallet is the thing being _rewarded_, not tested; for an issuer or
verifier badge it never was the system under test. A delivery failure is a
retry, not a diagnosis.

## Consequences

- **The first real issuance is irreversible**, so P4 stops at a credential
  review gate before it — the unsigned document, the resolved ids, the three
  page states, and the snapshot shape are reviewed before any OB3 reaches a
  wallet.
- **The badge document must be OB3-valid to the same bar `minimal-ob3` meets.**
  Real-wallet testing after the gate found four OID4 wallets refused the badge
  while accepting the same wallets' credentials from a reference issuer: the badge
  omitted `issuer.id` (the services overwrite it, so it must exist) and the
  OB3-required `Achievement.description` (and a top-level `description`). The fix
  is to mirror `minimal-ob3`'s required fields rather than the plan's minimal
  sketch — a reminder that the credential review gate must check the document
  against OB3's required fields and the proven recipe, not only against the plan.
- **A new env var, `BADGE_ROOT_URL`**, names the public origin the badge ids
  resolve to. It is this app's origin, not the transaction service's
  (`exchangeHost` would have been wrong). Until `did:web` is hosted at that
  origin, badges issue from the tenant's `did:key`, which is correct for dev.
- **The `(base, additive, role)` keying exists with no second badge to exercise
  it.** When an optional/additive scenario lands, registering `oid4-wallet-complete`
  is a data change, not a code change.
- **M9's export bundle already depends on this snapshot shape** — its
  `(badgeSlug, claimedAt)` identity and the `badges` array are fixed here.
- **A newly-registered scenario should join a profile as `optional` and be
  promoted to `required` at a deliberate catalog moment.** This is a convention,
  not something the validator can enforce (no rule tells a routine addition from
  a deliberate raising of the bar), and it is what keeps a claimed badge honest
  as the catalog grows.

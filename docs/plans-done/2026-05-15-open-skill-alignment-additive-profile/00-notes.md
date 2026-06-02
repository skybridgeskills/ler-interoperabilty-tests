# 2026-05-15 — Open Skill Alignment additive profile

## Scope of work

Introduce a new **additive profile** to the LER Interoperability Test Suite
that layers an **open skill-alignment workflow** on top of an Open Badges
3.0 base profile. The additive profile does not stand alone: it adds a set
of requirements + a credential-payload contract that, when combined with
the OB 3.0 base profile, produces an OpenBadgeCredential carrying
machine-readable skill-alignment data.

Concretely, when the additive profile is applied to an issuance:

- **Alignment target URLs** are CTDL resource URLs in the Credential
  Registry (e.g. `https://credentialengineregistry.org/resources/ce-…`).
  These appear on:
  - `achievement.alignment[].targetUrl` (skill alignment on the
    achievement)
  - `achievement.resultDescription[].alignment[].targetUrl` (the
    performance scale's alignment to a skill / framework node)
  - `credentialSubject.result[].alignment[].targetUrl` (per-result
    alignment, optional and additive to the description's alignments)
- **`credentialSubject.achievement.resultDescription[]`** is required and
  declares **one or more performance scales**, each with an
  `alignment[]` pointing to the aligned skill via a CTDL URL. Supported
  `resultType` values in this iteration:
  - `RawScore` (numeric; uses `valueMin` / `valueMax`)
  - `Percent` (numeric; 0–100; `valueMin: "0"`, `valueMax: "100"`)
  - `RubricCriterionLevel` (categorical; uses `rubricCriterionLevel[]`)
- **`credentialSubject.result[]`** is required and asserts the learner's
  performance on the declared scale(s) via `resultDescription` (URI back
  to the matching description) plus either `value` (RawScore / Percent)
  or `achievedLevel` (RubricCriterionLevel).

The user testing an issuance flow in the suite must be able to **opt in**
to this additive profile from the runner UI. The runner is a new
**issuer-side self-test page** for the
`direct-credential-issuance × ob3-direct-delivery` combination: the user
pastes the JSON of a credential they delivered, the suite verifies it
with `@digitalcredentials/verifier-core`, and the suite runs structural
checks against the Direct Credential Issuance Workflow requirements
(from
`strada-ecosystem-coordination-guide/profiles/ob-3.0-direct-delivery.md`).
When the open-skill-alignment toggle is on, additional structural
requirements (CTDL alignment URLs, `resultDescription[]` with a
supported `resultType`, `result[]` matched to a description) run on top
of the base requirement set and contribute to the per-requirement
report.

### In scope

- New first-class concept of an **additive profile** in the suite's
  interop model — separate from the existing standalone `Profile` type,
  with its own slug enum, schema, checklists, and routes.
- One concrete additive profile: `open-skill-alignment`, declared as
  applicable to base profile `ob3-direct-delivery` (and, by extension,
  any future OB 3.0–based profile).
- Issuer-side checklist for the additive profile under the
  `direct-credential-issuance` workflow.
- Verifier-side checklist for the additive profile under the
  `direct-credential-verification` workflow (consume + display skill
  data).
- A typed credential-payload contract: a TypeScript shape +
  `ZodFactory` that builds the `resultDescription[]` + `result[]`
  fragment from a typed input (scale type + alignment URLs + value /
  level).
- A fixture / sample dataset for the additive profile (one
  representative entry per supported `resultType`) for storybook + tests
  - the runner UI default.
- **New issuer-side runnable page** at, e.g.,
  `/issuer/direct-credential-issuance/ob3-direct-delivery/run` (final
  path decided in design):
  - Large textarea — paste a delivered credential JSON.
  - Toggle: "Include open skill alignment requirements".
  - "Verify" button — parses the JSON, runs `verifier-core`, runs
    static profile-conformance checks against the OB 3.0 Direct
    Delivery issuer checklist and (when toggled) the open
    skill-alignment additive issuer checklist.
  - Per-requirement results panel — each MUST / SHOULD / MAY entry
    renders pass / fail / warn / n/a with a one-line explanation
    (e.g. "credentialSubject.achievement.resultDescription[] is
    required by the open-skill-alignment additive profile").
  - Summary banner — overall verified / not verified, count of
    failing MUSTs.
- A typed **check-runner** that takes a parsed credential + a
  `verifier-core` result + the set of selected checklists and emits
  a per-requirement report. Each requirement on a checklist gets a
  `verify(credential, verifierResult, ctx) → CheckOutcome` function;
  unknown requirements default to `'n/a'` so we can land partial
  coverage without breaking the runner.
- A detail page for the additive profile (e.g. `/profiles/<slug>`
  style) listing its requirements alongside the base profile(s) it
  composes with.
- Storybook coverage for the runner panel states (idle / running /
  pass / fail / partial) and the per-requirement card.
- Schema tests for the additive-profile schema, the additive
  payload-fragment schema, the check-runner, and accessors.
- Add `@digitalcredentials/verifier-core` to `package.json`.

### Out of scope (deferred)

- Adding the additive profile to other base profiles (VCALM-EdDSA,
  OID4-ECDSA) — those base profiles don't have a runnable issuance
  surface in this repo yet, so we wait.
- Bringing the additive profile into the **wallet-acceptance** and
  **credential-presentation** workflows. The data is consumed by
  wallets, but there's no behavioral checklist diff worth shipping
  before the issuer / verifier sides land.
- A custom-data editor for the alignment URLs, scale, and value
  embedded in the runner UI. v1 surface is paste-only — the user
  brings their own credential. We ship downloadable sample
  credentials per supported `resultType` to seed the paste flow.
- Live resolution of CTDL URLs against the Credential Registry. The
  fixtures point at real-looking CE URLs but the suite does not
  dereference them, beyond what `verifier-core` happens to fetch
  (status list, DID resolution).
- Bundling multiple additive profiles at once. v1 only supports one
  additive profile selected at a time.
- Verifier-side runnable page (paste a credential, run the **Direct
  Credential Verification** workflow checks against the verifier's
  behavior). That mirrors this work but on the verifier side and is
  scoped separately.
- A separate runner page for VCALM-EdDSA / OID4-ECDSA issuer
  workflows. The new runnable page is scoped to
  `direct-credential-issuance × ob3-direct-delivery`.

## Current state of the codebase

Relevant pieces already in place:

- **Profile model**: `src/lib/interop/profile-schema.ts` defines
  `ProfileSlug` (`'vcalm-eddsa' | 'oid4-ecdsa' | 'ob3-direct-delivery'`),
  `WorkflowChecklist`, `Profile`. There is no concept of an additive /
  overlay profile.
- **Profiles**: `src/lib/interop/profiles/{vcalm-eddsa,oid4-ecdsa,ob3-direct-delivery}/`
  each have a `profile.ts` (meta), per-workflow checklist files, and an
  `index.ts` that composes them with `Profile({ ...meta, checklists })`.
- **`all-profiles.ts`** exports the ordered list used by `/profiles`.
- **Accessors**: `accessors.ts` exposes `profileBySlug`,
  `combinationFor`, `allCombinations`, `profileWorkflows`, etc.
- **OB 3.0 base profile**: `ob3-direct-delivery` has issuer + verifier
  checklists for the `direct-credential-issuance` /
  `direct-credential-verification` workflows. The issuer checklist
  already requires the OpenBadgeCredential type, eddsa-rdfc-2022,
  status list, did:web/did:key issuer. It does **not** currently
  require `result` or `resultDescription`.
- **OB 3.0 credential template (runner)**:
  `src/lib/server/domain/exchange-runner/ob3-credential-template.ts`
  produces an unsigned OpenBadgeCredential JSON the runner sends to the
  transaction service. The template has `credentialSubject.achievement`
  with `name`, `description`, `criteria.narrative` but **no**
  `resultDescription` or `alignment`, and no `result[]` on the subject.
- **Runner UI**: `RunnableWalletAcceptancePage.svelte` lives at
  `/wallet/credential-acceptance/vcalm-eddsa`. It calls
  `POST /api/exchange-runner/create` with no body; the server-side
  handler invokes `transactionServiceClient.createExchange({ retrievalId })`
  with the hardcoded `ob3CredentialTemplate(retrievalId)`. There is
  **no** UI control today for opting into additional credential data
  shapes.
- **Profiles index + detail**: `/profiles` lists all standalone
  profiles; `/profiles/<profile>` is the detail page (prerendered).
  Additive profiles are not represented in either.

The wallet-acceptance runner is currently the only place an actual OB
3.0 credential gets issued by the suite — so it is also the only place
the "select the optional additional profile for skill data" toggle has
something to mutate. The issuer-side `/issuer/[workflow]/[profile]`
route is read-only checklist content today.

## Style conventions (for this plan)

Drawn from `docs/style/` + `AGENTS.md`. Applies to this scope:

- **Factory functions** for any new services / builders
  (`function OpenSkillAlignmentBuilder(...)` returning an object).
- **`ZodFactory`** for every wire-shape / data-model addition:
  additive-profile schema, credential-payload fragment schema, the
  request body for the runner create-endpoint extension.
- **Domain-first layout.** Profile/credential schemas under
  `src/lib/interop/`; credential-payload merger and runner-side support
  under `src/lib/server/domain/exchange-runner/`; UI under
  `src/lib/components/interop/`. Files small (≤ ~200 lines); split
  early.
- **`asChild` on every `<Story>`** with custom layout markup.
- **TSDoc** on every public schema, accessor, and provider; one-liner
  on non-obvious helpers.
- **Tests colocated as `*.test.ts`** next to the file under test.
- **No singletons / module-level state.** Page state stays in Svelte 5
  runes; server uses the existing provider context.
- **Naming.** Slug: `open-skill-alignment` (kebab-case). Identifier:
  `openSkillAlignment` / `OpenSkillAlignmentProfile`. Result-type
  identifiers use the canonical OB 3.0 spec spellings (`RawScore`,
  `Percent`, `RubricCriterionLevel`).

## Acceptance criteria

- A new additive-profile concept ships with one populated entry,
  `open-skill-alignment`, declared compatible with
  `ob3-direct-delivery`.
- The additive profile defines issuer + verifier checklists for the
  `direct-credential-issuance` / `direct-credential-verification`
  workflows that explicitly require `credentialSubject.result[]` and
  `credentialSubject.achievement.resultDescription[]`, and require
  CTDL URLs on the relevant `alignment[]` entries.
- A typed builder produces the additive payload fragment for each
  supported result type (`RawScore`, `Percent`, `RubricCriterionLevel`),
  validated by zod.
- The runner page (`RunnableWalletAcceptancePage`) gains an opt-in
  toggle + result-type picker. When opted in, the issued OB 3.0
  credential includes the matching `resultDescription[]` on the
  achievement and `result[]` on the subject, with CTDL URLs on the
  alignment entries.
- A profile-detail route renders the additive profile's metadata and
  checklists, calling out the base profile(s) it composes with.
- Storybook stories cover: toggle off, toggle on + each of the three
  result types.
- `pnpm turbo validate` passes.

## Questions

### Q1. Plan scoping & phasing

**Context.** This work touches the interop data model
(`profile-schema.ts`), the OB 3 credential template
(`ob3-credential-template.ts`), the runner API (`POST
/api/exchange-runner/create`), the runner UI
(`RunnableWalletAcceptancePage`), the `/profiles` routing surface, and
the storybook stories.

**Suggested course forward.** One plan, six phases:

1. **Additive-profile schema + accessors.** Introduce
   `AdditiveProfileSlug`, `AdditiveProfile`, `allAdditiveProfiles`,
   `additiveProfileBySlug`. No content yet beyond the type and a
   placeholder.
2. **Open skill-alignment content.** Populate
   `open-skill-alignment` with profile meta, issuer +
   verifier checklists, and fixture data per result type. Wire it into
   `allAdditiveProfiles`. Add the new detail route surface.
3. **Credential-payload builder + schema.** Add a `ZodFactory` for the
   additive payload fragment and a factory builder that takes a
   typed input (resultType + alignment URLs + value / level) and
   returns the `resultDescription[]` + `result[]` fragment. Co-located
   unit tests for each result type.
4. **Runner API + template merge.** Extend the
   `ExchangeRunnerCreateRequest` to carry the optional additive-profile
   selection. Server-side, merge the fragment into
   `ob3CredentialTemplate` before sending. Tests for merged output.
5. **Runner UI.** Add the toggle + result-type picker on
   `RunnableWalletAcceptancePage`. Storybook stories for each state.
6. **Cleanup + validation.** `pnpm turbo validate`, summary, move
   plan to `docs/plans-done/`.

### Q2. Additive-profile vs base-profile modeling

**Context.** Two options for how the additive profile relates to the
existing `Profile` schema:

- (a) **New type alongside `Profile`** — `AdditiveProfile` with its own
  slug enum and accessor, that declares `appliesToBaseProfiles:
ProfileSlug[]`. The `Profile` type is unchanged. Routes can filter
  separately ("Profiles" vs "Additive profiles").
- (b) **Reuse `Profile` with an `isAdditive: boolean` flag** — single
  type, a flag toggles behavior. Routes filter by flag.
- (c) **Embed inside `Profile.compatibleAdditiveProfiles: …`** — model
  the relationship from the base side.

**Suggested course forward.** (a). The two are conceptually different
(additive can't be run alone, has a different relationship to
workflows, surfaces a credential-payload fragment), and a separate
type keeps the existing `Profile` accessors and pages unchanged. The
relationship is declared on the additive side via
`appliesToBaseProfiles`.

### Q3. Where the runner toggle lives

**Context.** The only existing runnable surface in the suite is
`RunnableWalletAcceptancePage` at
`/wallet/credential-acceptance/vcalm-eddsa`. That's a wallet-acceptance
page but it issues a real OB 3.0 credential through the transaction
service — so the additive payload travels with that credential.

**Suggested course forward.** Add the toggle to the existing runner
page for now, with copy that frames it as "the issuer side of this
exchange will include open skill-alignment data". When we build a
standalone issuer runnable page later, that surface picks up the same
control set. We do not duplicate the toggle elsewhere.

### Q4. Result-type selection in the UI

**Context.** v1 ships three result-type fixtures: `RawScore`,
`Percent`, `RubricCriterionLevel`. The user testing the flow will
likely want to see each in isolation, not all three at once.

**Suggested course forward.** When the toggle is on, render a small
segmented control (or `RadioGroup`) with three options. Default is
`RawScore`. The selection drives which fixture the server-side merger
uses. No support yet for mixing types or supplying multiple
descriptions in one credential.

### Q5. Fixture / sample data shape

**Context.** v1 doesn't expose a form for typing the alignment URLs or
scale values. We need to ship plausible CTDL Credential Registry URLs
in the fixture so the issued credentials are realistic and verifiers
can be exercised end-to-end.

**Suggested course forward.** Bake three fixtures in
`src/lib/interop/additive-profiles/open-skill-alignment/fixtures.ts`:

- `RawScore` — performance scale 0–100, value `"87"`, aligned to a
  representative CE skill URL (e.g.
  `https://credentialengineregistry.org/resources/ce-…`).
- `Percent` — 0–100 percent, value `"82"`, same alignment shape.
- `RubricCriterionLevel` — three-level rubric ("Basic", "Proficient",
  "Mastery"), `achievedLevel` pointing at the "Proficient" URN. Each
  level carries an alignment to a CE rubric-criterion-level URL.

We surface the exact URLs used in the storybook story for review. If
the user wants different placeholder URLs we swap them before phase 5
lands.

### Q6. CTDL URL validation

**Context.** OB 3.0 `targetUrl` is just a URI. We could enforce the
`credentialengineregistry.org` host in the additive-profile builder.

**Suggested course forward.** No strict host validation. The schema
accepts `z.string().url()` and we document in checklist text that
"alignment URLs MUST resolve to CTDL resources in the Credential
Registry". This keeps the schema generic (private registries / CASS /
CASE / future hosts) while still requiring a URL.

### Q7. Server-side merge ergonomics

**Context.** `ob3CredentialTemplate(retrievalId)` returns a
`Record<string, unknown>`. We need to drop a `resultDescription[]`
into `credentialSubject.achievement` and a `result[]` onto
`credentialSubject` without mutating the base template.

**Suggested course forward.** Add a sibling
`mergeOpenSkillAlignment(template, fragment)` that returns a new
template, written as a small pure factory (`function
applyOpenSkillAlignment(template, fragment)`). The
`POST /api/exchange-runner/create` handler calls it only when the
request body opts in.

### Q8. Verifier-side checklist content

**Context.** The base `ob3-direct-delivery` verifier checklist (in
`verifier-direct-credential-verification.ts`) covers signature,
status, and schema. The additive verifier checklist needs to require
the verifier to surface skill-alignment data to its user.

**Suggested course forward.** Three steps:

1. "Parse and surface achievement-level alignments (CTDL URLs) and the
   declared `resultDescription[]`."
2. "Render each `result[]` entry against its matching
   `resultDescription` (scale + value-or-level)."
3. "Treat unknown `resultType` values gracefully (display raw `value` /
   `achievedLevel` and a notice)."

### Q9. Routes for the additive profile

**Context.** Standalone profiles route at `/profiles` and
`/profiles/<slug>`. The additive profile needs a discoverable detail
page; it should also be reachable from the runner toggle's "Learn
more" link.

**Suggested course forward.** Reuse `/profiles` as the listing surface
but render additive profiles in a separate section beneath the
standalone profile grid (label: "Additive profiles"). Detail page at
`/profiles/<additive-slug>` — the loader checks both the standalone
and additive accessors. If the user prefers a dedicated
`/additive-profiles/` namespace, swap to that in design.

### Q10. Test approach

**Context.** Existing patterns: zod schema tests, accessor tests,
storybook variants.

**Suggested course forward.**

- Unit: schema tests for `AdditiveProfile` + the payload-fragment
  schema; accessor tests for `additiveProfileBySlug` and
  `additiveProfilesForBaseProfile`; builder tests asserting the
  fragment shape per result type.
- Server: a small test on the merged template asserting shape +
  immutability of the input template.
- Storybook: stories for the toggle off / on + each result type;
  additive-profile card + detail variants.
- No new e2e in this plan (the transaction-service container doesn't
  need to change).

## Notes

### Resolved answers

- **Q1 — Phasing:** approved as suggested. One plan, six phases (schema
  - accessors → content → builder/schema → API + merge → UI → cleanup).
  * **Revised after Q3.** With the new issuer-side runnable page,
    phase 4 ("API + template merge") becomes "verifier-core
    integration + check-runner". Updated phase list:
    1. Additive-profile schema + accessors.
    2. Open skill-alignment content (additive profile meta + issuer
       - verifier checklists + sample-credential fixtures per result
         type).
    3. Profile-conformance check-runner + per-requirement check
       library (covering OB 3.0 Direct Delivery issuer checklist and
       open-skill-alignment additive issuer checklist). Co-located
       unit tests.
    4. `verifier-core` integration + server endpoint that runs
       verification on a pasted credential and returns the
       per-requirement report. (Server-side keeps node-only crypto
       deps off the browser bundle.)
    5. New issuer runnable page UI (paste textarea + toggle + results
       panel) + storybook stories.
    6. Cleanup + validation.
- **Q4 — verifier-core placement:** option (a). Server-side. A new
  `POST /api/issuer-runner/verify` endpoint runs `verifier-core` on
  the pasted credential, applies the check-runner against the
  parsed credential + verifier result, and returns the typed
  per-requirement report. Keeps node-only crypto deps off the
  browser bundle and aligns with the existing exchange-runner's
  provider/app-context pattern.
- **Q5 — Sample credentials:** option (a). Three independent fixtures,
  one per supported `resultType` (`RawScore`, `Percent`,
  `RubricCriterionLevel`). Each is a complete signed OB 3.0 Direct
  Delivery credential that passes both the base and additive
  checklists. Suite-owned signing key + did:key issuer keeps them
  valid through `verifier-core` without external infra. A small
  "Load sample" picker above the textarea pastes the chosen sample
  in; the user can then edit and re-verify. Each fixture doubles as
  the test fixture for the check-runner and the storybook variant
  for that result type.
- **Q6 — CTDL URL validation:** option (c) — allowlist with warn
  fallback, but with the checklist text written as **SHOULD** (not
  MUST). Rationale: leaves room for additional blessed registries
  later without rewriting the additive-profile spec.
  - Checklist text: "SHOULD use CTDL resource URLs in the Credential
    Registry for alignment `targetUrl` entries."
  - Allowlist (extensible constant):
    `['credentialengineregistry.org', 'sandbox.credentialengineregistry.org']`.
  - Check-runner outcomes:
    - Missing alignment or non-URL value → **fail** (this is the MUST
      side: "alignment.targetUrl MUST be a URL").
    - URL with host in allowlist → **pass**.
    - URL with host outside allowlist → **warn** ("targetUrl is a
      URL but its host is not in the recognized CTDL allowlist;
      additional blessed registries may be added later").
  - Schema stays `z.string().url()`; the host-allowlist lives in the
    check-runner only.
- **Q7 — Additive verifier checklist:** option (a). Three steps,
  content-only in this plan (no verifier-side runner builds in this
  plan). All three phrased as SHOULDs in v1:
  1. SHOULD parse and surface achievement-level alignments (CTDL
     URLs) and the declared `resultDescription[]` to the verifier's
     end-user.
  2. SHOULD render each `result[]` entry against its matching
     `resultDescription` (display the scale and the
     value-or-`achievedLevel`).
  3. SHOULD treat unknown `resultType` values gracefully — display
     the raw `value` / `achievedLevel` plus a notice that the
     verifier does not recognize the result type.
     No dereferencing of CTDL URLs in v1.
- **Q8 — Routes:** option (a). Mixed listing + nested runner.
  - `/profiles` index gains a second section ("Additive profiles")
    beneath the existing standalone grid.
  - Detail page lives at `/profiles/<slug>`; the loader tries both
    standalone and additive accessors. Additive detail page renders
    meta + the additive issuer/verifier checklists + a list of
    compatible base profiles (linking back to their detail pages).
  - New runnable page at
    `/issuer/direct-credential-issuance/ob3-direct-delivery/run` —
    a sibling of the existing read-only checklist route. Existing
    checklist page gains a "Run this" CTA linking to the runner.
    The additive-profile toggle lives inside the runner page only.
- **Q9 — Test approach:** approved as suggested.
  - Unit (Vitest): schema tests for `AdditiveProfile` + payload
    fragment; accessor tests; check-runner tests with table-driven
    fixtures (three good + a set of intentionally-broken variants
    covering missing fields, wrong types, off-allowlist hosts).
  - Server (Vitest, node): `POST /api/issuer-runner/verify`
    endpoint test with a faked `verifier-core` per request; one
    real-`verifier-core` smoke test on a good fixture, skippable
    via env.
  - Storybook: runner page states (idle / loading / pass /
    partial-fail / fatal-fail / additive-off-pass /
    additive-on-pass per resultType); additive profile cards on
    `/profiles`; additive-profile detail page variants.
  - No new Playwright e2e in this plan.
- **Q2 — Modeling:** option (a). Introduce a separate `AdditiveProfile`
  type with its own slug enum and accessor; declares
  `appliesToBaseProfiles: ProfileSlug[]`. The existing `Profile` schema
  and accessors stay untouched.
- **Q3 — Runner surface:** option (b). Build a **new issuer-side
  runnable page** for the `direct-credential-issuance` workflow.
  - No wallet exchange happens here — there is no wallet-side library
    in this repo yet to act as a counterpart to a live issuance
    exchange, and the Direct Delivery workflow doesn't use one anyway.
  - The page implements the **Direct Credential Issuance Workflow**
    from
    `strada-ecosystem-coordination-guide/profiles/ob-3.0-direct-delivery.md`:
    the user pastes the JSON of a credential they delivered, and the
    suite runs static + cryptographic checks against the
    Direct-Credential-Issuance and (optionally) the open
    skill-alignment additive-profile requirements.
  - Cryptographic verification uses
    `@digitalcredentials/verifier-core` (already used in
    `skybridgeskills/dcc/dcc-web-verifier-plus`; npm package
    `@digitalcredentials/verifier-core`).
  - Per-requirement checks run on the parsed credential JSON and on
    `verifier-core`'s response shape (verified / log / errors). Each
    requirement on the OB 3.0 Direct Delivery issuer checklist and on
    the open-skill-alignment additive issuer checklist is wired to a
    deterministic check function and renders pass / fail / warn / n/a
    in the runner UI.
  - The additive-profile toggle lives on this new page only (not on
    the wallet-acceptance runner).

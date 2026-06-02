# Summary — Open Skill Alignment additive profile

## Shipped

- **New `AdditiveProfile` concept** in the interop model
  (`src/lib/interop/additive-profile-schema.ts`). Separate slug enum,
  separate accessor (`additiveProfileBySlug`,
  `additiveProfilesForBaseProfile`); existing standalone `Profile`
  schema and routes untouched.
- **`open-skill-alignment` additive profile** populated with:
  - Profile meta (`appliesToBaseProfiles: ['ob3-direct-delivery']`).
  - Issuer × `direct-credential-issuance` checklist (10 requirements
    keyed by stable ids, covering `resultDescription[]` shape,
    `result[]` linkage, value-range, achieved-level matching, and
    CTDL alignment URLs).
  - Verifier × `direct-credential-verification` checklist (3 SHOULDs,
    content-only).
  - `OpenSkillAlignmentFragment` ZodFactory for the credential
    payload fragment.
  - Three sample credentials (`RawScore`, `Percent`,
    `RubricCriterionLevel`) usable as runner-page "Load sample"
    inputs and as test fixtures.
- **Profile-conformance check-runner** + per-requirement registry
  (`src/lib/server/domain/issuer-runner/`):
  - Per-requirement check functions for the OB 3.0 Direct Delivery
    issuer checklist and the open-skill-alignment additive issuer
    checklist.
  - Extensible CTDL host allowlist (`pass` / `warn` / `fail`).
  - Typed `CheckOutcome` + `IssuerRunnerReport` ZodFactories.
  - `verified` semantics: `true` iff no MUST resolves to `'fail'`.
    `'n/a'` MUSTs (process-step affordances, unregistered checks)
    are treated as benign.
- **`@digitalcredentials/verifier-core` integration**:
  - Typed `VerifierCoreClient` + `FakeVerifierCoreClient`.
  - `IssuerRunner` orchestrator wraps verifier-core + check-runner.
  - `provideRealIssuerRunner` / `provideFakeIssuerRunner` providers
    wired into `AppContext`, `DevAppContext`, `TestAppContext`.
  - `POST /api/issuer-runner/verify` endpoint accepts
    `{ credential, includeAdditive? }` and returns
    `IssuerRunnerReport`. Tolerates non-JSON and malformed shape
    inputs with `fatalError`-shaped 400s.
- **Runnable issuer page** at
  `/issuer/direct-credential-issuance/ob3-direct-delivery/run`:
  - Paste textarea + sample picker (RawScore / Percent / Rubric) +
    additive toggle + Verify button.
  - Per-requirement report grouped by checklist with pass / fail /
    warn / n/a badges + 1-line messages.
  - "Run this" CTA on the existing read-only checklist page links
    to the runner.
- **Profiles index + detail page** show additive profiles in a
  separate section beneath the standalone grid; detail page
  resolver tries both standalone and additive accessors and branches
  the rendered detail.
- **Storybook**: `AdditiveProfileCard`, `CredentialPasteForm`,
  `RequirementReport`, `IssuerRunnerPanel` — each with multiple
  variants.
- **Tests**: schema + accessor tests, per-check unit tests
  (table-driven over good fixtures + intentionally-broken variants),
  check-runner orchestrator tests, issuer-runner orchestrator tests,
  verify-endpoint server test. `pnpm turbo validate` passes (check +
  test + build).

## Deferred / follow-ups

- **Regenerate fixtures with real signatures.** The three sample
  credentials carry placeholder `proofValue`s ("REGENERATE\_…IN_PHASE_04"
  literal in the string). The intent in the design was to ship a
  small static `scripts/sign-fixtures.ts` and re-emit signed JSON
  during phase 02. Time pressure during the implementation deferred
  that. Practical implication: `verifier-core` will report the
  signature as invalid for these samples, which surfaces as a
  fatal-style error or failing `valid_signature` log entry — the
  user can still see every structural check pass, but the runner
  banner reads "not verified". Users pasting **their own** signed
  credentials see correct verifier-core results. Recommend signing
  the fixtures from a suite-owned `did:key` in a follow-up.
- **Verifier-side runnable page** (paste a credential, render the
  Direct Credential Verification workflow checks against the
  verifier's behavior). Mirrors this work on the verifier side; out
  of scope for v1.
- **Additive profile across other base profiles** (VCALM-EdDSA,
  OID4-ECDSA). Those base profiles don't have a runnable issuance
  surface in this repo yet.
- **Custom-data editor** in the runner UI for alignment URLs / scale
  values. v1 is paste-only.
- **CTDL URL dereferencing**. The runner does not resolve CTDL
  resource URLs against the Credential Registry beyond what
  verifier-core happens to fetch.
- **Real-verifier-core smoke test.** The design proposed an
  env-skippable smoke test against the real `verifier-core`. The
  current test suite uses the fake client end-to-end (TestAppContext
  wires `FakeVerifierCoreClient`) and the endpoint test fires the
  real test app context — practical coverage is good. A dedicated
  env-skippable test is still worth adding later.

## Notes for the next plan

- The runner-page Verify endpoint test occasionally exceeded the
  default 5s Vitest timeout (cold-start AsyncLocalStorage + dynamic
  import in `buildAppContext`). The test now sets
  `{ timeout: 30_000 }` at the `describe` block. If we see this
  pattern repeat on other server tests, consider hoisting the
  buildAppContext into a shared module-level cache.
- Adding `id` fields to existing checklist requirements is now the
  established way to wire them up to the check-runner. The phase 03
  approach (kebab-case id namespaced by profile slug) seems to read
  well.
- `verified === true` iff no MUST is `'fail'` (not "every MUST is
  `'pass'`") is the correct semantics for a check-runner that
  can only inspect the credential JSON. Several MUSTs from the OB
  3.0 Direct Delivery spec describe issuer-side process affordances
  (deliver as JSON file, validate before delivery) that can't be
  evaluated from a single credential.

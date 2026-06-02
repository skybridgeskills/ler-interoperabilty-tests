# Design: Open Skill Alignment additive profile

## Scope of work

Introduce a new **additive profile** concept to the LER Interoperability
Test Suite, populate it with one entry — `open-skill-alignment` — and
ship a new **issuer-side runnable page** for the
`direct-credential-issuance × ob3-direct-delivery` combination. The
runnable page lets a developer paste a delivered Open Badges 3.0
credential JSON, runs `@digitalcredentials/verifier-core` on it
server-side, then runs static profile-conformance checks against the
OB 3.0 Direct Delivery issuer checklist (from
`strada-ecosystem-coordination-guide/profiles/ob-3.0-direct-delivery.md`)
and, when the user opts in, the open-skill-alignment additive issuer
checklist. The response is a typed per-requirement report rendered as
pass / fail / warn / n/a rows in the UI.

The additive profile carries:

- `appliesToBaseProfiles: ProfileSlug[]` — for v1, `['ob3-direct-delivery']`.
- Issuer + verifier checklists for the
  `direct-credential-issuance` / `direct-credential-verification`
  workflows. Verifier-side is content-only in this plan (no runner).
- A typed credential-payload fragment shape
  (`resultDescription[]` + `result[]`) that defines the additive data
  layered onto an OpenBadgeCredential. Three supported `resultType`
  values: `RawScore`, `Percent`, `RubricCriterionLevel`.
- Three signed sample credentials (one per supported `resultType`)
  that pass both the base and additive issuer checklists and seed the
  runnable page + storybook + check-runner tests.

CTDL alignment URLs are a SHOULD on `alignment.targetUrl`. The
check-runner classifies allowlisted hosts (Credential Engine
production + sandbox) as `pass`, other URLs as `warn` (additional
blessed registries may be added later), and non-URLs as `fail`.

## File structure

```
ler-interoperability-test-suite/
├── package.json                                                # UPDATE: add @digitalcredentials/verifier-core
├── docs/plans/2026-05-15-open-skill-alignment-additive-profile/
│   ├── 00-notes.md                                             # done
│   ├── 00-design.md                                            # this file
│   ├── 01-additive-profile-schema.md                           # NEW
│   ├── 02-open-skill-alignment-content.md                      # NEW
│   ├── 03-check-runner.md                                      # NEW
│   ├── 04-verify-endpoint.md                                   # NEW
│   ├── 05-runner-page.md                                       # NEW
│   └── 06-cleanup-and-validation.md                            # NEW
├── src/lib/interop/
│   ├── profile-schema.ts                                       # no change
│   ├── additive-profile-schema.ts                              # NEW: AdditiveProfileSlug + AdditiveProfile ZodFactory
│   ├── additive-profile-schema.test.ts                         # NEW
│   ├── accessors.ts                                            # UPDATE: additiveProfileBySlug + helpers
│   ├── accessors.test.ts                                       # UPDATE
│   ├── index.ts                                                # UPDATE: re-export additive types/accessors
│   └── additive-profiles/
│       ├── all-additive-profiles.ts                            # NEW: ordered list
│       └── open-skill-alignment/
│           ├── profile.ts                                      # NEW: meta (slug, name, blurb, appliesToBaseProfiles)
│           ├── index.ts                                        # NEW: AdditiveProfile({ ...meta, checklists })
│           ├── issuer-direct-credential-issuance.ts            # NEW: additive issuer checklist
│           ├── verifier-direct-credential-verification.ts      # NEW: additive verifier checklist (content-only)
│           ├── payload-fragment-schema.ts                      # NEW: ZodFactory for the resultDescription[]+result[] shape
│           ├── payload-fragment-schema.test.ts                 # NEW
│           └── fixtures/
│               ├── raw-score.ts                                # NEW: signed sample credential
│               ├── percent.ts                                  # NEW
│               └── rubric-criterion-level.ts                   # NEW
├── src/lib/server/domain/issuer-runner/                        # NEW domain folder
│   ├── index.ts                                                # NEW: barrel
│   ├── provide-issuer-runner.ts                                # NEW: provider wiring
│   ├── verifier-core-client.ts                                 # NEW: factory wrapping @digitalcredentials/verifier-core
│   ├── verifier-core-client.test.ts                            # NEW: unit tests with a fake
│   ├── fake-verifier-core-client.ts                            # NEW: in-memory fake
│   ├── ctdl-allowlist.ts                                       # NEW: extensible host allowlist
│   ├── check-runner.ts                                         # NEW: orchestrator
│   ├── check-runner.test.ts                                    # NEW
│   ├── check-outcome.ts                                        # NEW: ZodFactory for { id, level, status, message }
│   ├── issuer-runner-report.ts                                 # NEW: ZodFactory for the response payload
│   └── checks/                                                 # NEW: per-requirement check functions
│       ├── index.ts                                            # NEW: registry mapping requirement ids → check fns
│       ├── ob3-direct-delivery-issuer.ts                       # NEW: checks for base issuer checklist
│       ├── ob3-direct-delivery-issuer.test.ts                  # NEW
│       ├── open-skill-alignment-issuer.ts                      # NEW: checks for additive issuer checklist
│       └── open-skill-alignment-issuer.test.ts                 # NEW
├── src/lib/server/build-app-context.ts                         # UPDATE: provideIssuerRunner in DI graph
├── src/routes/api/issuer-runner/verify/                        # NEW
│   ├── +server.ts                                              # NEW: POST handler
│   └── server.test.ts                                          # NEW
├── src/lib/components/interop/
│   ├── additive-profile-card/                                  # NEW
│   │   ├── AdditiveProfileCard.svelte
│   │   ├── AdditiveProfileCard.stories.svelte
│   │   └── index.ts
│   └── issuer-runner/                                          # NEW
│       ├── credential-paste-form/
│       │   ├── CredentialPasteForm.svelte                      # NEW: textarea + sample picker + toggle + verify btn
│       │   ├── CredentialPasteForm.stories.svelte
│       │   └── index.ts
│       ├── requirement-report/
│       │   ├── RequirementReport.svelte                        # NEW: pass/fail/warn/na per-row report
│       │   ├── RequirementReport.stories.svelte
│       │   └── index.ts
│       └── issuer-runner-panel/
│           ├── IssuerRunnerPanel.svelte                        # NEW: orchestrates form + report
│           ├── IssuerRunnerPanel.stories.svelte
│           ├── issuer-runner-panel-types.ts
│           └── index.ts
├── src/lib/pages/runnable-issuer-direct-issuance/              # NEW page-level
│   ├── RunnableIssuerDirectIssuancePage.svelte
│   └── index.ts
├── src/routes/profiles/+page.svelte                            # UPDATE: render "Additive profiles" section
├── src/routes/profiles/[profile]/+page.ts                      # UPDATE: resolver tries additive too
├── src/routes/profiles/[profile]/+page.svelte                  # UPDATE: branch render on profile kind
├── src/routes/issuer/[workflow]/[profile]/+page.svelte         # UPDATE: "Run this" CTA on the matching combo
└── src/routes/issuer/direct-credential-issuance/ob3-direct-delivery/run/
    ├── +page.svelte                                            # NEW: renders RunnableIssuerDirectIssuancePage
    └── +page.ts                                                # NEW: prerender=false
```

## Conceptual architecture

```
┌─ Browser ─────────────────────────────────────────────────────────────┐
│  /issuer/direct-credential-issuance/ob3-direct-delivery/run           │
│  └─ RunnableIssuerDirectIssuancePage                                  │
│       state: { credentialText, includeAdditive,                       │
│                report?, error?, status: idle|running|done|error }     │
│                                                                       │
│       └─ IssuerRunnerPanel                                            │
│            ├─ CredentialPasteForm                                     │
│            │    • Load-sample picker (RawScore | Percent | Rubric)    │
│            │    • Toggle: "Include open skill alignment requirements" │
│            │    • Verify button → POST /api/issuer-runner/verify      │
│            └─ RequirementReport (renders from server response)        │
│                 • summary banner (verified? fail-count)               │
│                 • per-checklist groups, per-requirement rows          │
│                   (pass / fail / warn / n/a + 1-line message)         │
└───────────────────────────────────────────────────────────────────────┘
                                   │ POST { credential, includeAdditive }
                                   ▼
┌─ Server ──────────────────────────────────────────────────────────────┐
│  POST /api/issuer-runner/verify                                       │
│   1. ZodFactory-parse request body                                    │
│   2. issuerRunner.verify({ credential, includeAdditive })             │
│        → verifierCoreClient.verifyCredential(credential)              │
│        → checkRunner.run({                                            │
│             credential, verifierResult,                               │
│             checklists: [                                             │
│               ob3DirectDelivery × issuer × direct-credential-issuance,│
│               …optional open-skill-alignment × issuer × …             │
│             ]                                                         │
│          })                                                           │
│        → IssuerRunnerReport (typed, ZodFactory)                       │
│   3. json(report)                                                     │
└───────────────────────────────────────────────────────────────────────┘
                                   │
        ┌──────────────────────────┼─────────────────────────────────────┐
        ▼                          ▼                                     ▼
verifier-core-client          check-runner                          ctdl-allowlist
@digitalcredentials/        per-requirement registry              extensible host set
verifier-core              (key → CheckFn(creds, vc, ctx))         + warn/fail logic
(signature, DID, status)
```

### Data-model deltas

```ts
// additive-profile-schema.ts
export const AdditiveProfileSlug = ZodFactory(z.enum(['open-skill-alignment']));

export const AdditiveProfile = ZodFactory(
	z.object({
		id: z.string(),
		slug: AdditiveProfileSlug.schema,
		name: z.string(),
		version: z.string(),
		status: z.string(),
		lastUpdated: z.string(),
		description: z.string(),
		appliesToBaseProfiles: z.array(ProfileSlug.schema).min(1),
		checklists: z.array(WorkflowChecklist.schema)
	})
);

// payload-fragment-schema.ts (open-skill-alignment)
export const OpenSkillAlignmentFragment = ZodFactory(
	z.object({
		resultDescription: z.array(/* …resultDescription with resultType + alignment */).min(1),
		result: z.array(/* …result linked to a resultDescription */).min(1)
	})
);

// check-outcome.ts
export const CheckOutcome = ZodFactory(
	z.object({
		id: z.string(),
		level: z.enum(['MUST', 'SHOULD', 'MAY']),
		status: z.enum(['pass', 'fail', 'warn', 'n/a']),
		message: z.string()
	})
);

// issuer-runner-report.ts
export const IssuerRunnerReport = ZodFactory(
	z.object({
		verified: z.boolean(),
		fatalError: z.object({ message: z.string(), hint: z.string().optional() }).optional(),
		groups: z.array(
			z.object({
				checklist: /* { profileSlug, kind: 'base'|'additive', workflow, role } */ z.unknown(),
				outcomes: z.array(CheckOutcome.schema)
			})
		)
	})
);
```

### Per-requirement check registry

Each `ChecklistRequirement` gains an optional stable `id` (kept
optional so existing checklists stay valid while we add ids as we
register checks). The registry maps `id → (credential, verifierResult,
ctx) => CheckOutcome`. Requirements without a registered check default
to `'n/a'` with a "not yet implemented" message — supports partial
coverage without breaking the runner.

### Graceful degradation

- Invalid JSON in the textarea → server returns `fatalError` with the
  parse error; the runner renders the fatal banner only.
- `verifier-core` throws → server returns `fatalError` with the
  cryptographic-verification failure summary; per-requirement
  outcomes that depend on it become `'n/a'`.
- Additive toggle off → check-runner only loads the base checklist.
- Additive toggle on but `resultDescription` / `result` missing →
  additive checks fail; base checks unaffected.

## Style conventions

Drawn from `docs/style/` + `AGENTS.md`. The relevant subset for this
work:

- **Factory functions, not classes.** `IssuerRunner`, `CheckRunner`,
  `VerifierCoreClient` all return objects via
  `function Foo(): { … }`.
- **`ZodFactory`** for every wire-shape addition: `AdditiveProfile`,
  `OpenSkillAlignmentFragment`, `CheckOutcome`,
  `IssuerRunnerReport`, the verify endpoint's request body.
- **Provider-context DI.** New domain wires in via
  `provideIssuerRunner({ … })` and is exposed on `AppContext`.
- **Domain-first layout.** Schemas + content under
  `src/lib/interop/`; runtime + crypto under
  `src/lib/server/domain/issuer-runner/`; UI under
  `src/lib/components/interop/issuer-runner/` and
  `src/lib/pages/runnable-issuer-direct-issuance/`.
- **File size ≤ ~200 lines.** Split check-registry, allowlist, and
  per-checklist check modules out early.
- **Storybook stories** for every reusable component variant; `<Story>`
  blocks use `asChild` when they include layout markup.
- **TSDoc** on every public schema, accessor, factory, and provider.
- **Tests colocated** as `*.test.ts`. Three Vitest projects:
  `client` (browser), `server` (node), `storybook`.
- **No singletons / module-level state.** Page state stays in Svelte
  5 runes; server uses the existing `runInContext(AppContext)` per-
  request pattern.
- **Naming.** Slug `open-skill-alignment`. Identifier
  `openSkillAlignment` / `OpenSkillAlignmentAdditiveProfile`.
  Result-type identifiers use canonical OB 3.0 spec spellings
  (`RawScore`, `Percent`, `RubricCriterionLevel`).

## Acceptance criteria

- `AdditiveProfile` ZodFactory + `AdditiveProfileSlug` enum ship in
  `src/lib/interop/additive-profile-schema.ts`. `additiveProfileBySlug`
  - `additiveProfilesForBaseProfile` accessors compile and have
    passing tests.
- `open-skill-alignment` populated with meta + issuer + verifier
  checklists + three signed sample-credential fixtures.
- `OpenSkillAlignmentFragment` ZodFactory accepts each fixture's
  fragment and rejects malformed variants in tests.
- `POST /api/issuer-runner/verify` accepts
  `{ credential: unknown, includeAdditive: boolean }`, runs
  `verifier-core`, returns a typed `IssuerRunnerReport`.
- The new runnable page at
  `/issuer/direct-credential-issuance/ob3-direct-delivery/run` shows
  the textarea + sample picker + toggle + report. Loading any sample
  → toggling additive on → Verify produces an all-pass report.
- Existing checklist page at
  `/issuer/direct-credential-issuance/ob3-direct-delivery` has a
  "Run this" CTA linking to the runner.
- `/profiles` renders a second "Additive profiles" section with the
  new card; `/profiles/open-skill-alignment` renders the detail page
  with checklists + compatible-base-profile links.
- Storybook stories cover: runner page states (idle / running / pass
  / partial-fail / fatal-fail / additive-off-pass / additive-on-pass
  per resultType), additive-profile card, additive-profile detail.
- Check-runner tests cover pass / fail / warn / n/a outcomes against
  table-driven fixtures (three good + intentionally-broken variants).
- `pnpm turbo validate` passes.

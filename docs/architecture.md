# Architecture

A high-level tour of how the app is wired. Keep this doc honest as the
codebase evolves.

## High level

- **SvelteKit 2** (Svelte 5) on Node 24 (`@sveltejs/adapter-node`).
- One **AppContext per process**, built at boot from environment
  variables, then **wrapped per request** in AsyncLocalStorage so any
  server code can access services via thin accessors.
- **No database.** Day-one services are `LoggerService`, `TimeService`,
  `IdService`. Domain folders live under
  `src/lib/server/domain/<feature>/` — today: `wallet-crypto`,
  `wallet-client`, `issuer-runner`, `wallet-runner`, `exchange-runner`,
  and `verifier-runner` (the verifier acceptance-pass generator +
  scorer, plus the OID4VP and VCALM request floors and present-time
  delivery; see
  [`adr/2026-07-04-verifier-assessment-model.md`](adr/2026-07-04-verifier-assessment-model.md)).

## Scenarios

A **scenario** is the suite's runnable unit: one small, subtle measurement made of
ordered steps, each with an optional action and its own fine-grained
requirements. It replaces the combination `(role, workflow, profile)` as the
thing you run. See
[`adr/2026-08-13-scenario-as-runnable-unit.md`](adr/2026-08-13-scenario-as-runnable-unit.md).

The model lives in `src/lib/interop/scenarios/` and is **client-safe** — nothing
in it imports from `src/lib/server/`:

| File                      | What it holds                                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `scenario-schema.ts`      | `Scenario`, `ScenarioStep`, `ScenarioAction`, and the opaque `RecipeId` / `RequestId` / `IssuingIntent` ids |
| `requirement-schema.ts`   | `Requirement`, `RequirementLevel`, `RequirementCheck`, `AttestedAnswer`                                     |
| `membership.ts`           | `Membership`, `MembershipLevel`, `OneOfGroup`                                                               |
| `scenario-fingerprint.ts` | `scenarioFingerprint()` — drift detection                                                                   |
| `catalog-validation.ts`   | `validateCatalog()` / `assertValidCatalog()`                                                                |
| `accessors.ts`            | `scenarioBySlug`, `scenariosFor`, `membershipsOfProfile` (`scenarioHref` is in `checklist-href.ts`)         |
| `all-scenarios.ts`        | the registry, validated at module evaluation                                                                |

Four properties are load-bearing:

- **`workflow` is taxonomy only.** It groups the catalog and never constrains
  what a step's action may do.
- **`ScenarioAction` is a closed union** (`issue`, `request-presentation`,
  `deliver-direct`). Extending it is the only escape hatch — a new kind is
  reviewed once and reusable forever, unlike a bespoke page.
- **The level belongs to the membership, not the scenario.** A scenario carries
  `memberships[]`, each `required | optional | { oneOf }`, exactly one naming a
  base profile. So a profile is a _derived_ set of memberships
  (`membershipsOfProfile`), not a list stored on the profile.
- **Drift is derived, never declared.** There is no `version` field;
  `scenarioFingerprint()` hashes scoring-relevant content (requirement ids,
  levels, statements, answer kinds, `choose` options and right answers, step
  actions) and excludes cosmetic fields (`name`, `blurb`, `shuffleLabel`, step `id`/`title`/
  `summary`), so copy-editing never costs anyone their results.

### Catalog validation

`all-scenarios.ts` calls `assertValidCatalog()` at module evaluation and
**throws**, naming every violation at once — an invalid catalog is a build-time
authoring bug, not a runtime condition. `validateCatalog()` is the pure form
that returns the list. Eight rules:

1. Scenario slugs are unique.
2. Step ids are unique within a scenario.
3. Requirement ids are unique within a scenario.
4. Exactly one membership names a base profile.
5. **Every member of a `oneOf` group declares the same requirement ids.** The
   load-bearing one: a group is one obligation, so the completion denominator
   must not depend on which alternative the operator ran.
6. A `choose` answer's `correct` is one of its own option values.
7. Shuffled steps form a single contiguous run.
8. **A scenario with any shuffled step declares `shuffleLabel`.** A shuffled
   step's authored `title` is an answer key ("Offer an expired credential"), so
   the page never renders it — `shuffleLabel` is the neutral positional noun it
   renders instead. Without it, the page would have to fall back to the title,
   which is the leak the field exists to prevent.

### The run engine

`src/lib/interop/scenario-run/` turns a definition plus operator input into a
completed run. **Headless and pure** — no Svelte, no `localStorage`, no server
imports, and time and randomness are injected rather than read ambiently, so it
is deterministic under test. A page drives it; it drives nothing.

| File                     | What it holds                                                   |
| ------------------------ | --------------------------------------------------------------- |
| `evidence.ts`            | `StepEvidence` / `RunEvidence` and the accessors a check reads  |
| `automatic-checks.ts`    | the `AutomaticCheck` type and the id-keyed registry (`checks/`) |
| `run-state.ts`           | `ScenarioRunState`, the step lifecycle, `startRun`              |
| `shuffle.ts`             | seeded permutation of contiguous shuffled runs                  |
| `score-answer.ts`        | attested answer, and automatic check, → `RequirementOutcome`    |
| `requirement-outcome.ts` | the persisted outcome shape                                     |
| `roll-up.ts`             | outcomes → `passed \| failed \| incomplete`                     |

Four behaviours are load-bearing, and each has a test asserting it:

- **Automatic requirements resolve the moment a step settles, before any
  attested question is scored.** They are the wire truth, and showing "delivery
  completed ✓" while asking "so was it stored?" is the best teaching moment the
  suite has.
- **`cant-tell` fails.** "My wallet gave me nothing to judge by" is precisely the
  legibility failure under test; bucketing it as incomplete would park the
  commonest real failure mode in limbo and punish the honest answer. So
  `incomplete` means only "not answered yet".
- **A failing `SHOULD` is recorded and shown but does not block**; only a failing
  `MUST` fails the scenario. The unanswered check runs first — a run in progress
  is not yet a verdict.
- **A retry is simply `startRun` again**: fresh exchange, fresh fixture, fresh
  shuffle seed, every requirement answered anew. There is no answer editing and
  no answer-locking machinery, because re-answering after a reveal tests nothing.

`RunEvidence` is keyed by step id rather than holding only the current step's,
so a check **can** read a prior step. Nothing shipped crosses steps yet;
round-trip will, and the shape admits it without a rewrite.

A check that cannot be resolved (the catalog names an unregistered `checkId`)
**fails** rather than throwing — authored data should surface an authoring error,
not collapse a live run. A step that errored outright leaves its automatic
requirements **unresolved rather than failed**: we did not observe them, and
recording a failure we did not measure is the dishonesty the whole design avoids.

### The scenario page

`/scenarios/[slug]` is the **one generic route** — `ScenarioPage.svelte` renders
any catalog scenario, and **there are no bespoke scenario pages, ever**. The
route (`src/routes/scenarios/[slug]/`) resolves the scenario, parses attach
params and 404s an unknown slug in `+page.ts`; a `+page.server.ts` resolves
blocked-ness up front so a scenario this deployment cannot serve renders disabled
before the operator tries. `ScenarioPage.svelte` is a template over
`createScenarioRunController` (`scenario-run-controller.svelte.ts`), which owns
the run's `$state` and drives the engine — the component decides nothing about
scoring. URL reading stays at the route boundary; the page component takes props,
so Storybook drives the same component.

- **Step-as-spine.** Each step is a collapsing card
  (`components/interop/scenario-step/`) with its action rendered inside it —
  superseding the two-column `RunnableChecklist` layout for scenarios. A live
  step is expanded; a settled step collapses to a one-line summary and stays
  reopenable, which keeps a multi-step run short on a phone.
- **The reveal rule.** A step's setup is always visible and its requirement
  statements are always visible; only the **expected answer is concealed**, per
  requirement, until that requirement is answered — then revealed in the
  verdict-strip treatment. Automatic requirements resolve when the step settles,
  **before** its attested questions are answerable, so the operator sees what the
  wire said before being asked what they saw.
- **`can't tell` is always offered** on every attested requirement, is appended
  by the component (never authored, never omittable), fails, and renders in the
  warning family — amber, so it is visibly a failure yet distinguishable from a
  wrong answer.
- **A run records only when every requirement is answered.** Finish is disabled
  with a count until then, never hidden. A step that errors therefore makes a run
  **unrecordable** — its automatic requirements stay unresolved — and the page
  offers only "Start over". Navigating away records nothing.
- **Attach mode** adopts an externally-minted exchange into step 1, and **only
  for a single-action-step scenario**: in a shuffled scenario step 1 is random,
  so adopting into it is both meaningless and a leak of which pass the operator
  is on.
- **`shuffleLabel` + position** is the only label a shuffled step ever shows; its
  authored title is an answer key. The label is resolved by the controller, never
  by the step card, so the leak cannot be reintroduced by a component reading the
  whole step.

## Provider dependency injection

The provider system in `src/lib/server/util/provider/` is a lightweight
DI mechanism built on AsyncLocalStorage. It lets us share services
across startup, request handling, tests, and stories without manual
threading.

Key concepts:

- **Provider**: a function that returns a slice of context. Convention:
  `provideThing()` for no-config, `ThingProvider(opts)` PascalCase
  factory when configuration is needed.
- **Provider chain**: `Providers(a, b, c)` composes slices into one
  context object. Each provider receives the accumulated context, so
  later providers can depend on earlier ones.
- **Context types**: `XxxCtx = OutputOfProvider<typeof provideXxx>`.
- **Access**: `providerCtx<Ctx>()` reads the current context;
  `providerCtxSafe<Ctx>()` returns `Partial<Ctx>` (no throw).

A walkthrough with runnable examples lives in
[`src/lib/server/util/provider/README.test.ts`](../src/lib/server/util/provider/README.test.ts).

### Service slice pattern

Each service has a Real and a Fake variant, both factory functions
returning the same interface:

```
src/lib/server/services/time-service/
  time-service.ts            # interface + RealTimeService + FakeTimeService
  time-service.test.ts       # exercises both
  provide-time-service.ts    # provideTimeService + FakeTimeServiceProvider + accessor
```

The dev context wires `RealTimeService`; the test context wires
`FakeTimeService` with a fixed instant. Tests that need to advance time
can recover the fake surface via `asFakeTimeService()`.

### Adding a new service

1. Pick a folder: `src/lib/server/services/<name>/`.
2. Write `<name>-service.ts` with interface + `Real…` + `Fake…` factories.
3. Co-locate `<name>-service.test.ts` exercising both variants.
4. Add `provide-<name>-service.ts` with the no-config provider, the
   `XxxCtx` type, and a thin accessor function.
5. Register the service in `AppContext` and in both
   `dev-app-context.ts` and `test-app-context.ts`.
6. Use it via the accessor inside `runInContext` scopes.

### Adding a new domain feature

Domain code lives under `src/lib/server/domain/<feature>/` (see the
list in [High level](#high-level)). Within a feature folder, organize
by what files _do_ (`ops.ts`, `queries.ts`, `schemas.ts`) rather than
by type.

## Request lifecycle

`src/hooks.server.ts` handles each request:

1. Read the per-process AppContext (built once at module evaluation via
   `buildAppContext`).
2. Mint a request ID with `idService.short('req')` and stash it on
   `event.locals.requestId`.
3. Run the SvelteKit handler inside `runInContext(ctx, …)` so server
   code in any route or +server endpoint can read services.

The two endpoints already wired (`/health`, `/version`) demonstrate
this: `/health` calls `appContext()` (which throws helpfully if the
context is missing) and returns `{ status: 'ok', version }`; `/version`
returns the package + git info from `appVersion()`. A third endpoint,
`GET /health/ready`, runs the health registry's config-readiness check
(503 when overall is `DOWN`); the server also emits a periodic
`health-snapshot` structured log for Loki/Grafana (see
`src/lib/server/health/`).

## Exchange runner — minting, and attach mode

The four runnable wallet routes
(`/wallet/credential-{acceptance,presentation}/{vcalm,oid4}`) drive a real
exchange against the DCC transaction service. There are two ways in, and the
page's read path is identical afterwards.

**Mint** (the default). The page `POST`s **a scenario action** to
`/api/exchange-runner/create`, takes the one protocol link its profile speaks
(`iu`, `OID4VCI`, or `OID4VP`), renders the QR, and polls
`GET /api/exchange-runner/[exchangeId]?stepCount&workflow` every 2s until the
exchange settles.

The body is `{ kind: 'issue', credential, tamper?, intent?, exchangeIdPrefix? }`
or `{ kind: 'request-presentation', request }`. (`deliver-direct`, the third
`ScenarioAction` kind, mints no exchange and never reaches here.) There is no
default action: an unrecognised body is a 400, as is an id no registry knows or
an intent this deployment cannot serve.

### What a scenario may vary, and where it comes from

`src/lib/server/domain/scenario-runner/` holds the id-keyed registries the
catalog reaches into. Scenarios stay client-safe data; the documents and
tenancy live here.

- **`credential-recipes.ts`** (+ `recipes/`) — `RecipeId` → an unsigned OB3
  document. The claim workflow's template is `{{{vc}}}`, a Handlebars
  **triple-stache**, so the document a recipe builds _is_ the credential. The
  services overwrite only `credentialSubject.id`, `credentialStatus`,
  `issuer.id` and `proof`; everything else — dates, achievement content,
  `image`, `alignment`, arbitrary extra fields — is the recipe's. Expiry and
  not-yet-valid therefore cost nothing. A recipe **must not hardcode the
  credential `id`**: the status service's allocate is idempotency-guarded per
  credential id, so the route mints a fresh one per exchange.
- **`presentation-requests.ts`** (+ `requests/`) — `RequestId` → the
  `vprCredentialType` / `vprContext` / `vprClaims` / `trustedIssuers` a verify
  exchange is minted with.
- **`resolve-issuing-context.ts`** — the seam between a scenario's
  `IssuingIntent` and what the deployment can actually serve. **Absent intent
  means elective** (the transaction service already ranks issuer instances by
  the wallet's advertised suites); present means pinned. An unservable pin
  returns a typed `CannotServe`, which the route surfaces as a 400 and the UI
  renders as a disabled scenario — **still counted in the completion
  denominator**, so the badge is blocked rather than quietly made easier.

Two variables are worth calling out on the wire. **`tamper`** (`'proof'` or
`'claim'`) corrupts the credential _after_ signing and before delivery, which is
the only way to get a proof and payload that genuinely disagree.
**`exchangeIdPrefix`** is a **sibling of `variables`, not a member of it** — it
rides into the minted `exchangeId` and so appears in the exchange journal, which
outlives the exchange itself (`EXCHANGE_TTL`).

Cryptosuite and DID method are **deployment configuration**, not request
variables: they ride the tenant (`TENANT_CRYPTOSUITE_<T>` on the signing
service, and `did:web` when `TENANT_DID_URL_<T>` is set). This suite holds one
tenant, so `resolveIssuingContext` answers from
`TRANSACTION_SERVICE_TENANT_CRYPTOSUITE` / `_DID_METHOD`. When a
`(cryptosuite, didMethod) → tenant` map or a transaction-service API takes over,
**only that function changes — no scenario is touched.**

**Attach** (`?exchangeId=…&workflow=claim|verify`). The exchange was minted
_outside_ the suite — by an interop-probe CLI, or another harness — and the page
adopts it by id:

- `+page.ts` parses the query (`client/exchange-runner/attach-params.ts`) and
  passes `attachExchangeId` / `attachWorkflow` in as props. **URL reading stays
  at the route boundary**: the page components are also driven by Storybook
  stories, so they stay parameterised rather than location-aware.
- On mount, `attachExchange()` (`client/exchange-runner/attach-exchange.ts`)
  `GET`s `/api/exchange-runner/[exchangeId]/protocols?workflow=…`, which returns
  the same `{ exchangeId, protocols, workflowId }` body `create` does. The page
  then sets `interactionUrl`, goes to `awaiting-wallet` and polls exactly as a
  minted run does.
- **Attach offers no path to minting.** No `onInitiate`, no `onRetry` (it would
  mint) and no `onReset` (its only exit is minting) reach
  `ExchangeRunnerPanel`; with no `onInitiate` the panel replaces its idle CTA
  with an explanation instead of rendering a control that cannot work.
- Attach renders **observations, not verdicts** — the per-step display and the
  run record are unchanged, and `deriveRunStateFromExchange` maps steps
  positionally, so a probe whose step shape differs from the checklist's will
  show approximate per-step states.

The adopt endpoint is a separate route from the poll endpoint on purpose: the
poller ticks every 2s and does not need protocols, which never change. It
mirrors the poll route's disabled-hint, workflow parsing and error mapping, so
the runner API keeps one error vocabulary.

`getProtocols` sits on the `TransactionServiceClient` interface beside
`createIssuanceExchange` / `createVerificationExchange` / `getExchange`, and is
implemented by both the real HTTP client and the in-memory fake. Note the wire
asymmetry it absorbs: the transaction service's `POST …/exchanges` returns the
protocols object bare, while `GET …/protocols` wraps it in `{ protocols }`.
Callers see the one shape.

> **During a probe sitting, point `TRANSACTION_SERVICE_URL` at the host dev
> transaction service, not the pinned compose image** — see
> [`docker/README.md`](../docker/README.md#attach-mode-and-probe-sittings).

## Theme system

Lives in `src/routes/layout.css`:

- `:root` declares the **Tokyo Night light** token set as CSS custom
  properties (`--background`, `--foreground`, `--primary`, `--accent`,
  …).
- `.dark` redeclares the same names with the **Tokyo Night dark**
  values. The `@custom-variant dark` rule wires Tailwind's `dark:`
  utility to the `.dark` ancestor.
- `@theme inline` exposes each token as a Tailwind utility token
  (`bg-background`, `text-foreground`, …) and binds the JetBrains Mono
  - Inter font stacks to `--font-mono` / `--font-sans`.
- Custom display utilities (`text-display-lg`, `text-headline-md`,
  `text-label-md`) default to `font-mono` so headers carry the
  dev-tool feel.

Flash prevention: an inline script in `app.html` reads
`localStorage.theme` and toggles `.dark` on `<html>` before paint. The
`+layout.svelte` `onMount` and the `ThemeToggle` keep the class in sync
on subsequent navigations and OS-preference changes.

## Client-side persistence

The app keeps two pieces of state in `localStorage`, isolated under
`src/lib/client/`:

- **Selection** (`client/selection/selection-store.svelte.ts`) — the user's
  chosen roles/profiles, key `lits.selection.v1`. A Svelte 5 runes store;
  hydrate from a browser `onMount` only (never during SSR). Unknown slugs are
  validated away on read via `RoleSlug`/`ProfileSlug` schemas.
- **Scenario runs** (`client/scenario-runs/scenario-run-store.ts`) — one
  `ScenarioRunRecord` per scenario, key `lits.scenario-runs.v1`. The pure model
  lives in `interop/scenario-run/`; only the store touches `localStorage`. It
  `safeParse`s every entry and drops malformed ones — never throws to the UI.

The record is a flat map keyed by scenario slug, **not** an array per bucket:

```
{ scenarioSlug, ranAt, fingerprint, status, outcomes, attempts }
```

**One result per scenario — the latest — plus an `attempts` counter.** Nothing
in the UI wants more. Holding history costs one schema bump (the value type
becomes an array; the record travels unchanged), which is priced as affordable
and deliberately not pre-built. `recordScenarioRun` owns the increment, so no
call site can get the count wrong.

Each entry of `outcomes` carries the raw answer, the **expected** answer, the
derived status and the `automated | attested` source. Denormalising the expected
answer is what lets a stored run render its reveal without the live definition.

**Drift drops the record.** On read, each record's `fingerprint` is compared
against the live scenario's; a mismatch — or a slug the catalog no longer holds
— means the record is silently discarded and the row reverts to "not run". There
is no `outdated` state to render. This is also what lets an export bundle carry
no scenario definitions: records from a catalog that has moved on just drop.

`lits.run-history.v2` and `.v1` are **removed on first write and never read**.
There is no migration: those runs were keyed by a combination that is no longer
runnable, their `statuses` used a deleted requirement vocabulary, and their
`checklistFingerprint` hashed a `profile.checklists` that is on its way out. See
[`docs/adr/2026-08-13-scenario-run-record-and-completion.md`](adr/2026-08-13-scenario-run-record-and-completion.md)
(supersedes [`2026-07-11-run-history-v2-flat-record.md`](adr/2026-07-11-run-history-v2-flat-record.md)).

### Completion and the meter

`src/lib/interop/completion/` turns stored runs into the numbers the meter
renders, for one `(profile, role)` set. Pure — it takes the runs and returns
arithmetic.

**The governing rule: the meter fills exactly when the badge becomes claimable.**
They share a header, so `isClaimable()` is the single predicate both use; the
meter never re-derives `met === total` on its own.

Five rules, each with a test:

1. **The unit is the requirement, not the scenario** — a row reads
   `4/5 requirements met`, so the meter visibly adds up from its own rows, and a
   scenario with four passes and one failing SHOULD is not flattened to a ✗.
2. **A `oneOf` group is one obligation.** Members declare identical requirement
   ids (catalog rule 5), so the group contributes that set once and stops gating
   as soon as one member passes.
3. **`optional` memberships are excluded from the base meter** and get their own
   sub-meter. Including them would mean the base could never fill.
4. **A blocked obligation does not shrink the denominator.** When
   `resolveIssuingContext` reports the deployment cannot serve a pinned pair,
   those requirements stay in `total` and contribute nothing to `met` — the
   badge is blocked, because a shrinking denominator would let two deployments
   issue badges that look identical and mean different things.
5. **Only a `pass` outcome is met.** A failing SHOULD is therefore unmet here
   while still not failing its scenario; both numbers come from the same
   outcome map and answer different questions.

## Test harness

`vite.config.ts` declares three Vitest projects:

| Project     | Includes                                    | Where                         |
| ----------- | ------------------------------------------- | ----------------------------- |
| `client`    | `src/**/*.svelte.{test,spec}.{js,ts}`       | Browser (Playwright Chromium) |
| `server`    | `src/**/*.{test,spec}.{js,ts}` (non-svelte) | Node                          |
| `storybook` | every `*.stories.svelte` via `addon-vitest` | Browser (Playwright Chromium) |

`pnpm turbo test` runs all three. The redundant `test:storybook` script
is kept for manual debugging only — running it in parallel with
`test:vitest` makes them fight over Playwright.

Playwright e2e specs live under `e2e/`. `pnpm turbo e2e` depends on
`build` and uses `pnpm preview` as the web server. CI runs `check` and
`test`; e2e runs locally only for now.

## Pointers into the style guide

- [Philosophy](style/philosophy.md) — composition, pure functions,
  immutability.
- [Factory functions](style/factory-functions.md) — why we don't use
  classes.
- [Providers](style/providers.md) — DI conventions.
- [Schemas](style/schemas.md) — `ZodFactory` patterns.
- [Naming](style/naming.md), [File organization](style/file-organization.md),
  [Documentation](style/documentation.md).

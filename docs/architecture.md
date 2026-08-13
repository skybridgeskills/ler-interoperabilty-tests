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
| `accessors.ts`            | `scenarioBySlug`, `scenariosFor`, `membershipsOfProfile`                                                    |
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
  actions) and excludes cosmetic fields (`name`, `blurb`, step `id`/`title`/
  `summary`), so copy-editing never costs anyone their results.

### Catalog validation

`all-scenarios.ts` calls `assertValidCatalog()` at module evaluation and
**throws**, naming every violation at once — an invalid catalog is a build-time
authoring bug, not a runtime condition. `validateCatalog()` is the pure form
that returns the list. Seven rules:

1. Scenario slugs are unique.
2. Step ids are unique within a scenario.
3. Requirement ids are unique within a scenario.
4. Exactly one membership names a base profile.
5. **Every member of a `oneOf` group declares the same requirement ids.** The
   load-bearing one: a group is one obligation, so the completion denominator
   must not depend on which alternative the operator ran.
6. A `choose` answer's `correct` is one of its own option values.
7. Shuffled steps form a single contiguous run.

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

The homepage console keeps two pieces of state in `localStorage`, isolated
under `src/lib/client/`:

- **Selection** (`client/selection/selection-store.svelte.ts`) — the user's
  chosen roles/profiles, key `lits.selection.v1`. A Svelte 5 runes store;
  hydrate from a browser `onMount` only (never during SSR). Unknown slugs are
  validated away on read via `RoleSlug`/`ProfileSlug` schemas.
- **Run history** (`client/run-history/run-history-store.ts`) — the latest 3
  `TestRunRecord`s per `(role, workflow, profile)` combination, key
  `lits.run-history.v2`. Pure model + status derivation live in
  `interop/run-history/`; only the store touches `localStorage`. Reads
  `safeParse` every entry and drop malformed ones — never throw to the UI.

The run record is a **flat, id-keyed v2 shape** (see the ADR below), not a
discriminated `payload` union:

```
{ id, role, workflow, profile, ranAt, status,
  checklistFingerprint,
  statuses: Record<requirementId, RequirementStatus>,
  error?, pinned? }
```

`id` (`crypto.randomUUID()`) and `ranAt` (ISO string) default in the factory.
`status` is `passed | failed | incomplete`. `statuses` holds the
presentation-ready per-requirement rows keyed by requirement id — the persisted
`RequirementStatus` (`{ tone, label, message?, attested? }`) deliberately omits
the live-only `raw` debug body (the in-memory `RequirementStatusView` adds it
back). `checklistFingerprint` is an order-independent djb2 hash over the
combined checklist's `id␟level␟text` rows (base + additives), used only for
equality-based drift detection.

The selection key stays `.v1`; run history bumped to `.v2` and **abandons** the
old v1 store rather than migrating it (v1 records lacked per-row statuses and a
fingerprint, so rendering them as reports would fabricate data). The store never
reads `.v1` and clears it on first write (`LEGACY_STORAGE_KEY`). Retention is
per-combination and isolated in `applyRetention()` (cap 3), shaped to later
preserve a `pinned` flag (reserved on `TestRunRecord`, unset in MVP) without an
API change. `runById(id)` scans the buckets to resolve a single run for the
reopen route. See
[`docs/adr/2026-07-11-run-history-v2-flat-record.md`](adr/2026-07-11-run-history-v2-flat-record.md)
(supersedes [`2026-06-10-run-history-local-persistence.md`](adr/2026-06-10-run-history-local-persistence.md)).

### Reopening a run — the view-only `/runs/[id]` route

`src/routes/runs/[id]/` renders a saved run as a shareable, print-to-PDF report.
It is **client-only** (`prerender = false`, `ssr = false`) — the record lives in
`localStorage`, whose id is unknown at build time. After mount it resolves the
record via `runById(id)`, re-derives the live combined checklist through
`interop/accessors` (`combinationFor` + `additiveChecklistsForCombination`), and
runs a strict `checklistFingerprint` drift check
(`reopenStateFor` → `not-found | outdated | render`). An **outdated** run (the
checklist drifted since the run) is blocked and prompts a re-run — never
migrated or partially reconciled. A **current** run repaints the display-only
`RunnableChecklist` (fed the persisted `statuses` map) plus a `RunHistorySummary`,
and prints via the browser's own print dialog (`window.print()`).

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

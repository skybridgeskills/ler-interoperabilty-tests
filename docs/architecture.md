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

# Architecture

A high-level tour of how the app is wired. Keep this doc honest as the
codebase evolves.

## High level

- **SvelteKit 2** (Svelte 5) on Node 24 (`@sveltejs/adapter-node`).
- One **AppContext per process**, built at boot from environment
  variables, then **wrapped per request** in AsyncLocalStorage so any
  server code can access services via thin accessors.
- **No database.** Day-one services are `LoggerService`, `TimeService`,
  `IdService`. Domain folders (`src/lib/server/domain/<feature>/`) get
  added when the first feature plan lands.

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

Domain code lives under `src/lib/server/domain/<feature>/`. No domain
folders exist yet — the first feature plan creates the first one. Within
a feature folder, organize by what files _do_ (`ops.ts`, `queries.ts`,
`schemas.ts`) rather than by type.

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
returns the package + git info from `appVersion()`.

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

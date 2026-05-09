# Summary — 2026-05-09 SvelteKit scaffold

## What landed

A working SvelteKit application in `ler-interoperability-test-suite/`
scaffolded to mirror `skills-verifier`'s conventions, with the Tokyo
Night palette as the day-one visual identity. The repo now compiles,
type-checks, lints, formats, runs three Vitest projects + Playwright e2e
green, and CI runs `check + test` on every push and PR.

## Major moving pieces

- **Toolchain**: pnpm 10.22.0 + Turborepo + Husky 9 + lint-staged 16.
  ESLint 9 + Prettier 3 with import-order, unused-imports,
  Svelte-specific overrides; pre-commit auto-formats staged files only.
- **Build**: SvelteKit 2 (Svelte 5) with `@sveltejs/adapter-node`. Vite 7. Tailwind v4 via `@tailwindcss/vite`.
- **Provider DI**: `src/lib/server/util/provider/` (verbatim copy from
  skills-verifier) drives an AsyncLocalStorage-based AppContext per
  request. `hooks.server.ts` mints request IDs and wraps each request.
- **Day-one services** (each with Real + Fake variants and unit tests):
  `LoggerService` (pino), `TimeService`, `IdService`. Wired by
  `dev-app-context.ts` and `test-app-context.ts`, switched on
  `env.CONTEXT`.
- **Endpoints**: `/health` returns `{ status, version }`; `/version`
  returns the version body alone (both exercised by the e2e smoke).
- **Theme**: Tokyo Night palette in `:root` + `.dark` CSS custom
  properties, mapped into Tailwind utilities via `@theme inline`. Inter
  - JetBrains Mono fonts. `ThemeToggle` cycles light → dark → system;
    inline `app.html` script prevents flash before paint.
- **UI primitives**: `Button`, `Card`, `Badge`, `Input`, `Tabs`,
  `Dialog` (shadcn-svelte), each with a `*.stories.svelte` exercising
  variants.
- **Storybook + Vitest**: Storybook 10 with `@storybook/addon-vitest`.
  Three Vitest projects — `client` (browser), `server` (node),
  `storybook` (browser via Playwright). All stories run as tests.
- **App shell**: `AppHeader` (brand + Wallet/Verifier/Issuer nav +
  ThemeToggle), `LandingPage` (hero + three nav cards), three
  placeholder routes using the shared `ComingSoon` component.
- **E2E**: Playwright config + one smoke spec covering landing render
  and `/health`. `pnpm turbo e2e` depends on `build`.
- **CI**: single `.github/workflows/ci.yml` running
  `pnpm install --frozen-lockfile`, `playwright install chromium`,
  then `pnpm turbo check test`.
- **Docs**: `docs/style/` (eight files, copied verbatim from
  skills-verifier), `AGENTS.md`, `README.md`, `docs/architecture.md`,
  `docs/design-system.md`, MIT `LICENSE`. `.vscode/{launch,settings}`
  for the in-IDE experience. `scripts/print-app-version.sh`.

## Test coverage at end of plan

- **51 Vitest tests** across 15 files (server unit + client browser +
  storybook stories), all green.
- **2 Playwright e2e specs**, both green against the production build.
- `pnpm turbo validate` (= check + test + build) passes clean.

## Deferred, with pointers

- **No domain folders pre-created.** First feature plan creates the
  first one under `src/lib/server/domain/<feature>/`.
- **No AWS / DynamoDB integration.** The provider system leaves room to
  add a `provideStorage` slice when persistence is needed.
- **No deploy pipeline.** CI runs `check + test` only. Production
  deploy + e2e in CI land in a follow-up plan.
- **`test:storybook` removed from `pnpm turbo test`'s dependency chain.**
  It runs the same Vitest config as `test:vitest`, and running them in
  parallel makes them fight over Playwright. Kept as a manual debugging
  script.

## Drift from the original plan

- **Q3 palette**: chose Tokyo Night (cool indigo + cyan + magenta)
  instead of the originally-suggested terminal-green default.
- **Q8 primitives**: expanded from 3 (Button/Card/Badge) to 6
  (Button/Card/Badge/Input/Tabs/Dialog) per user direction. Each got a
  story.
- **shadcn-svelte v1.2.7** generated "nova" style components rather
  than the older "default" style; we adopted the new defaults.

## TODOs intentionally retained

None. All `TODO(phase-XX)` markers from intermediate phases are
resolved; only the example-code TODOs in the plan markdown files
themselves remain (they're examples of what the file should look like
mid-plan, not action items).

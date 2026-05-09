# 2026-05-09 — SvelteKit scaffold: Design

## Scope of work

Stand up a fresh SvelteKit application in
`ler-interoperability-test-suite/` whose mechanical scaffolding mirrors the
conventions used in `skills-verifier`. The scaffold is the foundation for a
developer-facing **test suite of self-help resources** for building
**wallets, verifiers, and issuer tools** for Open Badges credentials (and
later other LER credential formats).

This plan covers scaffolding only — working app shell, dev loop, test
harness, Storybook, theming (Tokyo Night palette, dark default), provider
DI skeleton, and a minimal nav. Specific test-suite features land in later
plans.

Anchor decisions from `00-notes.md`:

- Single SvelteKit package + Turborepo (no `pnpm-workspace.yaml`).
- npm name: `ler-interoperability-test-suite`. Title: "LER Interoperability
  Test Suite".
- **Tokyo Night-style** palette (cool indigo/violet base, cyan + magenta
  accents). Dark is the primary surface; light is a clean inverse.
  JetBrains Mono display, Inter body.
- `@sveltejs/adapter-node` + provider/app-context skeleton from day one.
- Day-one services: `LoggerService` (pino), `TimeService`, `IdService`.
- Storybook + Vitest integration mirrored exactly: three Vitest projects
  (`client` browser, `server` node, `storybook` browser via Playwright
  Chromium) + `@storybook/addon-vitest` + `test:storybook` script.
- Playwright config + one smoke spec (landing render + `/health`).
- shadcn-svelte primitives generated on day one: **Button, Card, Badge,
  Input, Tabs, Dialog**, each with a story.
- `AppHeader`: brand + Wallet/Verifier/Issuer placeholder nav (each routes
  to a "coming soon" page) + theme toggle.
- Husky 9 + lint-staged 16 + `.lintstagedrc.fast.json` (prettier on staged
  files only).
- One `.github/workflows/ci.yml` running `pnpm install` then `pnpm turbo
check test` on push and PR.
- No pre-created `domain/` folders (first feature plan decides cuts).
- MIT license at repo root.

## File structure

```
ler-interoperability-test-suite/
├── .cursor/commands/
│   ├── plan.md                                  # NEW: copied from skills-verifier
│   └── commit.md                                # NEW: copied from skills-verifier
├── .github/workflows/
│   └── ci.yml                                   # NEW: pnpm install + turbo check test
├── .husky/
│   ├── pre-commit                               # NEW: runs fix-staged-fast
│   └── _/                                       # NEW: husky internals
├── .storybook/
│   ├── main.ts                                  # NEW: story globs + addons
│   ├── preview.ts                               # NEW: theme init + a11y addon config
│   └── vitest.setup.ts                          # NEW: setProjectAnnotations
├── .vscode/
│   ├── launch.json                              # NEW: App: dev, Storybook
│   └── settings.json                            # NEW: format-on-save
├── docs/
│   ├── architecture.md                          # NEW: provider DI + routing model
│   ├── design-system.md                         # NEW: Tokyo Night palette + tokens
│   ├── style/                                   # NEW: copied + retargeted
│   │   ├── README.md
│   │   ├── philosophy.md
│   │   ├── naming.md
│   │   ├── factory-functions.md
│   │   ├── providers.md
│   │   ├── schemas.md
│   │   ├── file-organization.md
│   │   └── documentation.md
│   ├── plans/
│   │   └── 2026-05-09-sveltekit-scaffold/      # this plan
│   └── plans-done/                              # NEW: empty
├── e2e/
│   └── smoke.spec.ts                            # NEW: landing + /health
├── scripts/
│   └── print-app-version.sh                     # NEW: parallel to skills-verifier
├── src/
│   ├── app.d.ts                                 # NEW: Locals.requestId
│   ├── app.html                                 # NEW: Inter + JetBrains Mono fonts
│   ├── hooks.server.ts                          # NEW: per-request runInContext
│   ├── routes/
│   │   ├── layout.css                           # NEW: Tokyo Night tokens + tailwind
│   │   ├── +layout.svelte                       # NEW: AppHeader + theme init
│   │   ├── +page.svelte                         # NEW: landing (purpose + nav cards)
│   │   ├── +page.svelte.spec.ts                 # NEW: smoke render test
│   │   ├── health/
│   │   │   └── +server.ts                       # NEW: 200 + version
│   │   ├── version/
│   │   │   └── +server.ts                       # NEW: build version JSON
│   │   ├── wallet/+page.svelte                  # NEW: "coming soon"
│   │   ├── verifier/+page.svelte                # NEW: "coming soon"
│   │   └── issuer/+page.svelte                  # NEW: "coming soon"
│   └── lib/
│       ├── index.ts                             # NEW: package barrel
│       ├── utils.ts                             # NEW: cn() helper
│       ├── assets/
│       │   └── favicon.svg                      # NEW: simple monogram
│       ├── components/
│       │   ├── app-header/
│       │   │   ├── AppHeader.svelte             # NEW
│       │   │   ├── AppHeader.stories.svelte     # NEW
│       │   │   └── index.ts                     # NEW
│       │   ├── theme-toggle/
│       │   │   ├── ThemeToggle.svelte           # NEW: light/dark/system cycle
│       │   │   ├── ThemeToggle.stories.svelte   # NEW: dark mode demo (per Q3 ask)
│       │   │   └── index.ts                     # NEW
│       │   └── ui/                              # shadcn-svelte primitives
│       │       ├── button/{Button.svelte, button-variants.ts, *.stories.svelte, index.ts}
│       │       ├── card/   {Card.svelte, *.stories.svelte, index.ts}
│       │       ├── badge/  {Badge.svelte, badge-variants.ts, *.stories.svelte, index.ts}
│       │       ├── input/  {Input.svelte, *.stories.svelte, index.ts}
│       │       ├── tabs/   {Tabs.svelte, *.stories.svelte, index.ts}
│       │       └── dialog/ {Dialog.svelte, *.stories.svelte, index.ts}
│       ├── pages/
│       │   ├── LandingPage.svelte               # NEW: rendered by /+page.svelte
│       │   └── LandingPage.stories.svelte       # NEW
│       ├── storybook/
│       │   ├── responsive-preview.svelte        # NEW: util for stories
│       │   └── index.ts                         # NEW
│       └── server/
│           ├── app-context.ts                   # NEW: AppContext type + accessor
│           ├── app-env.ts                       # NEW: parseBaseEnv (CONTEXT)
│           ├── build-app-context.ts             # NEW: dev/test switch
│           ├── dev-app-context.ts               # NEW: pino-pretty logger
│           ├── test-app-context.ts              # NEW: silent + fixed time/id
│           ├── services/
│           │   ├── logging/
│           │   │   ├── logger-service.ts        # NEW
│           │   │   ├── logger-service.test.ts
│           │   │   └── provide-logger.ts        # NEW
│           │   ├── time-service/
│           │   │   ├── time-service.ts          # NEW (Real + Fake)
│           │   │   ├── time-service.test.ts
│           │   │   └── provide-time-service.ts  # NEW
│           │   └── id-service/
│           │       ├── id-service.ts            # NEW (Real + Fake)
│           │       ├── id-service.test.ts
│           │       └── provide-id-service.ts    # NEW
│           └── util/
│               ├── panic.ts + panic.test.ts     # NEW: copied
│               ├── zod-factory.ts               # NEW: copied verbatim
│               ├── app-version.ts               # NEW
│               └── provider/
│                   ├── providers.ts             # NEW: copied verbatim
│                   ├── provider-ctx.ts          # NEW: copied verbatim
│                   └── README.test.ts           # NEW: usage examples
├── static/
│   └── robots.txt                               # NEW
├── .env.example                                 # NEW: CONTEXT=dev, LOG_LEVEL
├── .gitattributes                               # NEW
├── .gitignore                                   # NEW
├── .lintstagedrc.fast.json                      # NEW
├── .npmrc                                       # NEW
├── .nvmrc                                       # NEW: matches skills-verifier
├── .prettierignore                              # NEW
├── .prettierrc                                  # NEW
├── AGENTS.md                                    # NEW: agent guide pointing at docs/style/
├── LICENSE                                      # NEW: MIT
├── README.md                                    # NEW: purpose + setup + turbo commands
├── components.json                              # NEW: shadcn-svelte config
├── eslint.config.js                             # NEW: copied
├── package.json                                 # NEW
├── playwright.config.ts                         # NEW
├── pnpm-lock.yaml                               # generated
├── svelte.config.js                             # NEW: adapter-node
├── tsconfig.json                                # NEW: copied
├── turbo.jsonc                                  # NEW: check/test/build/dev/storybook
└── vite.config.ts                               # NEW: 3 vitest projects
```

## Conceptual architecture

```
┌─ Browser (SvelteKit client) ──────────────────────────────────────┐
│  +layout.svelte  ──▶  AppHeader (brand + nav + ThemeToggle)       │
│                       LandingPage / wallet / verifier / issuer    │
│                                                                    │
│  Theme: layout.css defines :root and .dark CSS vars (Tokyo Night) │
│         ThemeToggle stores 'light'|'dark'|'system' in             │
│         localStorage; <html class="dark"> drives @custom-variant  │
└────────────────────────────────────────────────────────────────────┘
                            │ requests
                            ▼
┌─ SvelteKit server (adapter-node) ─────────────────────────────────┐
│  hooks.server.ts ─▶ runInContext(ctx, event)                      │
│                       │                                           │
│                       ▼                                           │
│   ┌─ AppContext (per request, AsyncLocalStorage) ──────────┐     │
│   │   logger     : LoggerService                            │     │
│   │   timeService: TimeService                              │     │
│   │   idService  : IdService                                │     │
│   └────────────────────────────────────────────────────────┘     │
│                                                                   │
│  build-app-context.ts switches on env.CONTEXT:                   │
│     'dev'  → DevAppContext  (pino-pretty, real time, real id)    │
│     'test' → TestAppContext (silent, fixed time, deterministic)  │
│                                                                   │
│  Endpoints: /health, /version (no domain endpoints yet)           │
└────────────────────────────────────────────────────────────────────┘

┌─ Provider DI (copied verbatim from skills-verifier) ──────────────┐
│  Providers(provideLogger, provideTimeService, provideIdService)   │
│  → AppContext                                                      │
│  Accessed via providerCtx<Ctx>() inside any server-side call.     │
└────────────────────────────────────────────────────────────────────┘

┌─ Test harness (Vitest) ───────────────────────────────────────────┐
│  client    : *.svelte.{test,spec}.ts in browser (Playwright)      │
│  server    : *.{test,spec}.ts in node (excludes svelte tests)     │
│  storybook : every story runs as a test in browser                │
│  e2e       : Playwright spec(s) under e2e/, depends on build      │
└────────────────────────────────────────────────────────────────────┘
```

## Main components and how they interact

- **`+layout.svelte`** mounts `AppHeader` on every route; renders `<main>` +
  children. An inline `<svelte:head>` script + `app.html` `<head>` preamble
  apply the saved theme before paint to prevent flash.
- **`AppHeader`** displays the brand mark, three nav links
  (`/wallet`, `/verifier`, `/issuer`), and `ThemeToggle`.
- **`ThemeToggle`** cycles `light → dark → system → light`; persists choice
  to `localStorage`; toggles `.dark` on `<html>`.
- **`layout.css`** declares Tokyo Night CSS vars under `:root` (light) and
  `.dark`, plus `@theme inline` mapping them to Tailwind utility tokens
  (`bg-background`, `text-foreground`, `text-primary`, etc.). Includes
  `@plugin '@tailwindcss/typography'`, `@tailwindcss/forms`,
  `@iconify/tailwind4`.
- **`hooks.server.ts`** builds the AppContext (dev or test, switched by
  `env.CONTEXT`) at boot, then wraps each request handler in
  `runInContext(ctx, …)` so any server code can read services via
  `providerCtx<AppContext>()`.
- **Services** (`LoggerService`, `TimeService`, `IdService`) are factory
  functions returning plain objects. Each has a `Real…` and a `Fake…`
  variant; the dev context wires Real, the test context wires Fake.
- **`/health`** returns `{ status: 'ok', version }` (200). **`/version`**
  returns the version body alone. Both are exercised by the e2e smoke spec.
- **shadcn-svelte primitives** under `src/lib/components/ui/` use
  `tailwind-variants` for variant tokens, `bits-ui` for headless primitives
  (Tabs, Dialog), and `clsx` + `tailwind-merge` (re-exported as `cn` from
  `lib/utils.ts`). Each primitive has a `*.stories.svelte` exercising its
  variants and behaviors.
- **Storybook** loads `routes/layout.css` in `preview.ts` and re-applies
  the same theme-init script so stories render under the active theme.
  `.storybook/main.ts` globs stories from `src/routes`,
  `src/lib/components`, and `src/lib/pages`.
- **Vitest** runs three projects from a single `vite.config.ts`. The
  `storybook` project uses `@storybook/addon-vitest`'s `storybookTest`
  plugin to turn every story into a test.

## Tokyo Night palette tokens

```css
:root {
	/* light */
	--background: hsl(220 23% 95%);
	--foreground: hsl(234 16% 13%);
	--card: hsl(220 22% 92%);
	--card-foreground: hsl(234 16% 13%);
	--popover: hsl(220 22% 92%);
	--popover-foreground: hsl(234 16% 13%);
	--primary: hsl(217 87% 45%); /* tokyo blue */
	--primary-foreground: hsl(0 0% 100%);
	--secondary: hsl(220 16% 86%);
	--secondary-foreground: hsl(234 16% 13%);
	--muted: hsl(220 16% 88%);
	--muted-foreground: hsl(232 10% 35%);
	--accent: hsl(261 60% 55%); /* tokyo magenta-violet */
	--accent-foreground: hsl(0 0% 100%);
	--warning: hsl(35 75% 40%);
	--destructive: hsl(350 70% 45%);
	--destructive-foreground: hsl(0 0% 100%);
	--border: hsl(220 13% 78%);
	--input: hsl(220 13% 78%);
	--ring: hsl(217 87% 45%);
	--radius: 0.5rem;
}

.dark {
	--background: hsl(234 16% 13%); /* #1A1B26 */
	--foreground: hsl(230 73% 86%); /* #C0CAF5 */
	--card: hsl(232 17% 17%);
	--card-foreground: hsl(230 73% 86%);
	--popover: hsl(232 17% 17%);
	--popover-foreground: hsl(230 73% 86%);
	--primary: hsl(217 87% 73%); /* #7AA2F7 */
	--primary-foreground: hsl(234 16% 13%);
	--secondary: hsl(231 13% 23%);
	--secondary-foreground: hsl(230 73% 86%);
	--muted: hsl(231 12% 20%);
	--muted-foreground: hsl(229 28% 70%);
	--accent: hsl(261 84% 78%); /* #BB9AF7 */
	--accent-foreground: hsl(234 16% 13%);
	--warning: hsl(35 65% 64%); /* #E0AF68 */
	--destructive: hsl(350 89% 71%); /* #F7768E */
	--destructive-foreground: hsl(234 16% 13%);
	--border: hsl(231 12% 25%);
	--input: hsl(231 12% 25%);
	--ring: hsl(217 87% 73%);
}
```

Fonts:

```html
<link
	href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=JetBrains+Mono:wght@400;500;700&display=swap"
	rel="stylesheet"
/>
```

`@theme inline` maps `--font-sans: Inter, …` and `--font-mono: 'JetBrains
Mono', …`. Display utility classes (`text-display-lg`, `text-headline-md`)
default to `font-mono` so headers carry the dev-tool feel.

## Style conventions

Copied/tightened from `docs/style/README.md`, `philosophy.md`, `naming.md`,
`factory-functions.md`, `providers.md`, `schemas.md`,
`file-organization.md`, `documentation.md`, and `AGENTS.md`. These apply to
every phase of this plan.

- **Factory functions, not classes.** `function MyService(deps) { return
{...} }`; `export type MyService = ReturnType<typeof MyService>`. No
  classes anywhere — closure variables hold private state.
- **`ZodFactory` for shared schemas.** Single source of truth for runtime
  validation + TS types. Always export both the factory and the
  `ReturnType<typeof Foo>` alias.
- **Providers for DI.** `provideThing` returns a single-key context slice
  (`{ thing: Thing(...) }`). Compose with `Providers(a, b, c)`. Read with
  `providerCtx<Ctx>()` inside a `runInContext` / `runWithProvider` scope.
  Provider factories with config use `ThingProvider(config)` PascalCase.
- **No singletons in injectable code.** Don't `import` a global service —
  put it in the provider chain.
- **Domain-first layout.** `src/lib/server/domain/<feature>/` (none yet —
  first feature plan decides cuts). Routes under `src/routes/`, colocated.
- **File size ≤ ~200 lines.** Extract helpers when a file approaches that
  ceiling.
- **Order by abstraction.** High-level exports first; helpers + types at
  the bottom. The export matching the file name comes first.
- **Naming.**
  - Files: `kebab-case.ts`. Co-located tests: `<file>.test.ts`.
  - Svelte components: `PascalCase.svelte` matching the component name.
  - Variables, functions, actions: `camelCase` verbs (`sendOffer`,
    `verifyCredential`).
  - Factories + Svelte components: `PascalCase`.
  - Providers: `provideThing` for simple, `ThingProvider` for
    config-taking factories.
  - Context types: `XxxCtx`.
  - Env vars: `SCREAMING_SNAKE_CASE`.
- **Imports.** Three groups separated by blank lines, alphabetized inside
  each, enforced by `eslint-plugin-import` and
  `eslint-plugin-unused-imports`:
  1. external (npm)
  2. `$lib/` / workspace
  3. relative
- **Documentation.** TSDoc on public APIs and non-obvious helpers. Tests
  serve as living documentation — name them by behavior, not by symbol.
  Co-locate examples (`README.test.ts`) with implementations.
- **No commits between phases** unless the user asks; final phase commits
  the whole plan together.

## Out of scope

- Any actual conformance test logic (OB 3.0 verification, OB 2.x legacy,
  VC-JWT decoding, status-list checks).
- AWS / DynamoDB integration.
- Production deploy pipeline (CI runs check + test only).
- Observability beyond pino dev logging.
- Auth, sessions, or persistent storage of any kind.

# 2026-05-09 — SvelteKit scaffold for ler-interoperability-test-suite

## Scope of work

Create a fresh SvelteKit application in
`/Users/notto/Projects/skybridgeskills/ler-interoperability-test-suite/` whose
mechanical scaffolding mirrors the conventions used in `skills-verifier`
(adjacent project, used as the reference). The scaffold's purpose is to host
a developer-facing **test suite of self-help resources** for building
**wallets, verifiers, and issuer tools** for Open Badges credentials (and,
later, other Learning and Employment Record credential formats).

This plan covers **scaffolding only** — getting a working app shell, dev
loop, test harness, Storybook, theming, and provider/service skeleton in
place. Specific features (e.g. wallet-acceptance flows, verifier conformance
runs, issuer self-checks) come in subsequent plans.

Scope items in detail:

- pnpm workspace, TypeScript, SvelteKit, Tailwind v4, Vitest (unit + browser),
  Playwright (e2e harness), Storybook (component + page stories with the
  Storybook/Vitest integration).
- ESLint + Prettier + import order + unused-imports plugin matching
  skills-verifier's `eslint.config.js`.
- Husky + lint-staged pre-commit (fast formatter on staged files).
- Turborepo task orchestration (`turbo check`, `turbo test`, `turbo dev`,
  `turbo storybook`, `turbo build`, `turbo validate`).
- App context / provider system parallel to `src/lib/server/util/provider/`
  and `src/lib/server/app-context.ts` so we can register services in dev /
  test / prod contexts.
- Theming: light / dark / system theme toggle in the layout. Default color
  theme should be **modern hacker friendly** (high-contrast dark-first
  palette, monospace accent, terminal-green / cyan / amber accent on a
  near-black background; accessible light variant).
- Storybook story demonstrating the dark-mode selection control on its own.
- Hello-world landing page documenting the app's purpose.
- Style guide / `AGENTS.md` / `.cursor/commands/{plan,commit}.md` copied (and
  adapted) so the planning loop continues to work in this repo.
- Health endpoint + version endpoint pattern (parallel to skills-verifier).

Out of scope for this plan:

- Any actual conformance test logic for OB3 / VC / wallet protocols.
- AWS / DynamoDB integration (skills-verifier has it; this app does not need
  it on day one — but the `services/` and `app-context` shape should leave
  room to add it without restructuring).
- E2E test specs beyond a smoke test.

## Current state of the codebase

`ler-interoperability-test-suite/` is an **empty git repo** (only `.git/`).
Nothing else exists. The plan directory + `.cursor/commands/` have just been
seeded from `skills-verifier`.

The reference repo (`skills-verifier/`) provides:

- `package.json` with the canonical dependency set we'll mirror (SvelteKit
  2.x, Svelte 5.x, Vite 7, Vitest 4, Tailwind v4, Storybook 10, bits-ui,
  tailwind-variants, lucide, iconify, zod 4, pino).
- `vite.config.ts` with three Vitest projects (`client` browser, `server`
  node, `storybook` browser) — we should copy this shape.
- `.storybook/{main,preview,vitest.setup}.ts` — copy structure; replace
  story globs.
- `src/lib/server/util/provider/` — provider DI system; copy verbatim.
- `src/lib/server/util/zod-factory.ts` — copy verbatim.
- `src/lib/components/theme-toggle/ThemeToggle.svelte` — copy and re-style
  for the new palette.
- `src/routes/layout.css` — replace palette tokens with the hacker theme,
  but keep the `@custom-variant dark`, `@theme inline`, base layer pattern.
- `docs/style/*` — copy and lightly re-target.
- `AGENTS.md`, `eslint.config.js`, `.prettierrc`, `tsconfig.json`,
  `svelte.config.js`, `turbo.jsonc`, `.husky/`, `.lintstagedrc.fast.json`,
  `.gitignore`, `.gitattributes`, `.npmrc`, `.nvmrc` — copy and re-target.

Things specific to skills-verifier that we should **not** carry over:

- The DynamoDB clients, AWS app context, framework-client, skill-search
  service, sample-entities, skill components, job-profile types, and any
  routes under `/jobs`, `/api/skill-search`, etc.
- The `pnpm-workspace.yaml` reference (we can keep one if multi-package
  ambitions exist; otherwise drop it).

## Style conventions (for this plan)

This scope touches code structure and UI, so the plan must follow the style
guide bullets we will copy from `skills-verifier/docs/style/`:

- **Factory functions, not classes.** `function FooService() { return {...} }`.
- **`ZodFactory` for shared schemas** so runtime + types stay in sync.
- **Providers for DI**: `provideX` returns a single-key context slice;
  compose with `Providers(a, b, c)`; access via `providerCtx<Ctx>()`.
- **Domain-first layout** under `src/lib/server/domain/<feature>/` (none on
  day one — but the convention is in place).
- **Files ≤ ~200 lines**; extract helpers early.
- **Naming**: kebab-case files, PascalCase factories + Svelte components,
  camelCase variables/actions, `provideX` providers, `XxxCtx` context types.
- **Imports**: external → `$lib/` → relative, alphabetized, blank lines
  between groups, unused-imports plugin enforced.
- **High-level first** in files; helpers + types at the bottom.

Re-confirm and re-copy these into `00-design.md` and each phase file.

## Questions to answer

Each question is asked one at a time during the question-iteration phase.
Each entry below holds: **context** (what's already true), **suggested
answer** (what I'd default to if not corrected), and a place for the user's
final answer.

### Q1 — Repo shape: single-package SvelteKit app, or pnpm workspace?

- **Context:** skills-verifier has `pnpm-workspace.yaml` (19 bytes, present
  but minimal) and Turborepo. The new app could be either a single SvelteKit
  package or a workspace ready for future packages (e.g. shared
  test-vector libraries, a CLI runner).
- **Suggested:** Start as a single-package SvelteKit app (no
  `pnpm-workspace.yaml`), but keep Turborepo so adding workspaces later is a
  one-file change.
- **Answer:** Single SvelteKit package + Turbo. No `pnpm-workspace.yaml`.

### Q2 — App name and `package.json` `name` field

- **Context:** Repo dir is `ler-interoperability-test-suite`. README of the
  reference uses `skills-verifier`. Slug needs to be valid for npm.
- **Suggested:** `name`: `ler-interoperability-test-suite`. Pretty title in
  README and `<title>`: **"LER Interoperability Test Suite"**.
- **Answer:** `name`: `ler-interoperability-test-suite`. Title: "LER Interoperability Test Suite".

### Q3 — Color theme details

- **Context:** User asked for "modern hacker friendly". skills-verifier uses
  HSL CSS variables with `--background`, `--foreground`, `--primary`,
  `--accent`, `--flame`, `--warmth`, etc., and a `.dark` selector that
  redefines them.
- **Suggested palette (proposal — please correct):**
  - Light mode: off-white background `hsl(120 15% 97%)`, near-black
    foreground `hsl(150 10% 8%)`, primary terminal-green
    `hsl(142 70% 38%)`, accent cyan `hsl(190 80% 35%)`, warning amber
    `hsl(38 95% 45%)`. Subtle phosphor glow on focus rings.
  - Dark mode (the _primary_ aesthetic): background `hsl(150 12% 6%)`,
    foreground `hsl(140 25% 88%)`, primary terminal-green
    `hsl(140 70% 60%)`, accent cyan `hsl(180 80% 60%)`, warning amber
    `hsl(40 95% 60%)`, destructive `hsl(0 75% 60%)`.
  - Fonts: **JetBrains Mono** for code/headings or display accents,
    **Inter** for body. (Self-host via Fontsource, or pull from Google
    Fonts as skills-verifier does.)
  - Subtle scanline / grid texture on hero only — opt-in, not global.
- **Answer:** Tokyo Night-style cool palette. Dark is the primary surface
  with light as the inverse:
  - Dark: `--background hsl(234 16% 13%)`, `--foreground hsl(230 73% 86%)`,
    `--primary hsl(217 87% 73%)`, `--accent hsl(261 84% 78%)`,
    `--warning hsl(35 65% 64%)`, `--destructive hsl(350 89% 71%)`.
  - Light: clean inverse with the same hues at desaturated/lower-lightness
    values (designed alongside dark; finalized in `00-design.md`).
  - Fonts: **JetBrains Mono** for display/code accents, **Inter** for body.
    Loaded via Google Fonts link in `app.html` (matches skills-verifier).
  - Drop the scanline/phosphor-glow ideas from the proposal — Tokyo Night
    aesthetic doesn't lean retro-CRT.

### Q4 — Backend / runtime expectations

- **Context:** skills-verifier uses `@sveltejs/adapter-node`,
  `pino`/`pino-pretty`, AsyncLocalStorage app context, an AWS context for
  prod. The new app is a self-help test suite — does it need a backend at
  all (i.e. could it be `adapter-static`)? Or do we expect server endpoints
  for things like running interop checks server-side, proxying credentials,
  caching test vectors?
- **Suggested:** Use `adapter-node` from day one (matches skills-verifier),
  with the same provider/app-context skeleton. Many of the planned features
  (running a verifier, proxying issuer webhooks, hosting a test issuer
  endpoint) will need a server. We can swap to `adapter-auto` or
  `adapter-static` later if it turns out we don't.
- **Answer:** `@sveltejs/adapter-node` + provider/app-context skeleton from
  day one.

### Q5 — Initial services to wire into the app context

- **Context:** skills-verifier registers `LoggerService`, `TimeService`,
  `IdService`, `FrameworkClient`, `StorageDatabase`, `SkillSearchService`.
  The first three are project-agnostic and useful immediately; the rest are
  domain-specific.
- **Suggested:** Register `LoggerService` (pino), `TimeService`, `IdService`
  on day one. Leave the provider chain trivially extensible so later phases
  can add e.g. `IssuerCheckService`, `WalletProbeService` without
  restructuring.
- **Answer:** `LoggerService` (pino), `TimeService`, `IdService`. Domain
  services land in feature plans.

### Q6 — Storybook test integration depth

- **Context:** skills-verifier runs three Vitest projects (client browser,
  server node, storybook browser). `test:storybook` is a separate command
  that exercises stories via Vitest + Playwright Chromium.
- **Suggested:** Mirror exactly — three Vitest projects + `test:storybook`
  command + `@storybook/addon-vitest`. It's the configuration that takes
  the longest to land correctly, and replicating it now avoids re-doing it.
- **Answer:** Mirror skills-verifier exactly: three Vitest projects (client
  browser / server node / storybook browser) + `@storybook/addon-vitest` +
  `test:storybook` script.

### Q7 — Playwright e2e on day one?

- **Context:** skills-verifier has a `playwright.config.ts`, an `e2e/`
  folder, and `turbo e2e` depending on `build`. The reference repo has only
  one e2e file, so it's mostly scaffolding.
- **Suggested:** Include Playwright config + a single smoke test
  (`/health` returns 200, landing page renders the expected `<h1>`). It
  costs ~30 lines and confirms the build works end-to-end.
- **Answer:** Yes — `playwright.config.ts` + one smoke spec covering
  landing render and `/health`. `turbo e2e` depends on `build`.

### Q8 — UI primitives: shadcn-svelte + bits-ui from day one?

- **Context:** skills-verifier uses `bits-ui` + `tailwind-variants` +
  `clsx` + `tailwind-merge` and a `components.json` for shadcn-svelte. We
  copied the dep list above. Even if we don't generate every primitive on
  day one, having the rigging in place lets later phases `pnpm dlx
shadcn-svelte add button` cleanly.
- **Suggested:** Yes. Land `Button`, `Card`, `Badge` to cover the scaffolded
  pages and the theme-toggle story. Defer everything else.
- **Answer:** Larger starter set. Generate `Button`, `Card`, `Badge`,
  `Input`, `Tabs`, `Dialog` via shadcn-svelte. Each gets a Storybook story
  in this plan so the design system is exercised against the Tokyo Night
  palette. Additional primitives via `pnpm dlx shadcn-svelte add ...` when
  needed.

### Q9 — Header / navigation scaffolding

- **Context:** skills-verifier has `AppHeader` showing the brand + theme
  toggle. The new app's navigation will eventually have sections for
  Wallet Tests, Verifier Tests, Issuer Tests.
- **Suggested:** Ship `AppHeader` with brand mark, three placeholder nav
  links (Wallet / Verifier / Issuer) that route to "coming soon" pages,
  plus the theme toggle. Real content lands in feature plans.
- **Answer:** `AppHeader` with brand mark, Wallet/Verifier/Issuer
  placeholder nav (each routes to a "coming soon" page), and theme toggle.

### Q10 — Husky + lint-staged + pre-commit speed

- **Context:** skills-verifier uses Husky 9, lint-staged 16, with a
  `.lintstagedrc.fast.json` that runs prettier on staged files only. Type
  checks and ESLint run via `turbo check`, not on every commit.
- **Suggested:** Mirror exactly. Pre-commit stays under a second; full
  checks happen on demand and (when we add it) in CI.
- **Answer:** Mirror skills-verifier. Husky 9 + lint-staged 16 +
  `.lintstagedrc.fast.json` running prettier on staged files only.

### Q11 — CI on day one?

- **Context:** skills-verifier has `.github/` (we haven't read it — likely
  has a workflow). The new repo has no GitHub Actions setup.
- **Suggested:** Add a single `ci.yml` that runs `pnpm install && pnpm
turbo check test` on push and PR. No deploy on day one.
- **Answer:** Single `.github/workflows/ci.yml` running `pnpm install` then
  `pnpm turbo check test` on push and PR. No e2e job, no deploy.

### Q12 — Naming for OB-related domain code on day one

- **Context:** Domain code under `src/lib/server/domain/<feature>/` will
  eventually hold things like Open Badges 3.0 verification, IMS OB 2.x
  legacy support, VC-JWT decoding, status list checks.
- **Suggested:** Don't create domain folders yet — wait until the first
  feature plan. Adding empty folders just to "claim space" tends to
  ossify naming before we know the right cuts.
- **Answer:** Don't pre-create. First feature plan decides the cuts.

### Q13 — License

- **Context:** skills-verifier README says `[Add license information]`.
  Open-source intent is implied. Sister projects in the org likely use
  Apache 2.0 or MIT.
- **Suggested:** Apache 2.0 (matches "open-source demonstration tool"
  framing). Add `LICENSE` + a short note in README.
- **Answer:** MIT. Add `LICENSE` file at repo root + license note in README.

### Q14 — Where the `00-design.md` and phase docs live for _this_ plan

- **Context:** Cursor `plan.md` puts plans at `docs/plans/<date>-<name>/`.
  We've created
  `docs/plans/2026-05-09-sveltekit-scaffold/`.
- **Suggested:** Keep that path. Final cleanup phase will move to
  `docs/plans-done/`.
- **Answer:** Keep `docs/plans/2026-05-09-sveltekit-scaffold/`. Final phase
  moves to `docs/plans-done/`.

## Notes

- Q8 expanded the UI primitive set from the original suggestion. Each
  generated primitive (`Button`, `Card`, `Badge`, `Input`, `Tabs`, `Dialog`)
  gets a Storybook story in this plan so we can confirm the Tokyo Night
  palette renders correctly across all of them in both modes.
- Tokyo Night palette is the day-one default; the light variant is designed
  alongside dark and finalized in `00-design.md` (Q3).

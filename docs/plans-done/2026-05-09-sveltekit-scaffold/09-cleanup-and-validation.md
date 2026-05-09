# Phase 09 — Cleanup & validation

## Scope of phase

Final cleanup, full validation, plan summary, plan move to `plans-done/`,
and a proposed commit message for human review and approval.

## Code Organization Reminders

- One concept per file (final pass — confirm).
- Place more abstract things, entry points, and tests **first** (final
  pass — confirm).
- Place helper utility functions **at the bottom** of files.
- No temporary code remains.

## Style conventions

- This phase is a final compliance pass against `docs/style/`. No new
  style decisions; just confirm prior phases followed the rules.

## Cleanup

### TODO sweep

```sh
git diff --stat                 # what touched
rg -n 'TODO\(phase-' src docs   # find every phased TODO
```

Resolve every `TODO(phase-XX)` marker — by phase 09, every marker should
be either:

- replaced by the code the marker promised (preferred), or
- removed because the original need went away (note in the plan summary).

Any remaining `TODO` (without a `phase-XX` tag) needs an explicit
justification — either it stays and points at a future plan, or it goes.

### Debug print sweep

```sh
rg -n 'console\.(log|warn|debug)' src e2e
rg -n 'logger\.debug' src
```

Remove ad-hoc `console.*` calls. `logger.debug` is fine where it has a
purpose; remove if it was only used for scaffolding bring-up.

### Unused export sweep

```sh
pnpm exec eslint . --max-warnings=0
```

`unused-imports/no-unused-imports` will flag dead imports; fix them.

### File-size pass

```sh
find src -name '*.ts' -o -name '*.svelte' | xargs wc -l | sort -nr | head -20
```

Anything over ~200 lines: confirm it earns its size or split it.

## Validate

```sh
pnpm turbo validate     # check + test + build (per turbo.jsonc)
                        # OR if `validate` isn't a category task in your
                        # turbo.jsonc, run them separately:
pnpm turbo check
pnpm turbo test
pnpm turbo build
pnpm turbo build:storybook   # confirm storybook builds for static hosting

pnpm turbo e2e          # smoke spec passes against the production build
```

All four must pass green. If anything is red, fix before moving on; do
**not** disable a test or downgrade a check to ship.

## Plan cleanup

### `summary.md`

Add `<plan-dir>/summary.md` with:

- One-paragraph summary of what landed.
- Bullet list of the major moving pieces (provider DI; Tokyo Night
  palette; six shadcn-svelte primitives; AppHeader + LandingPage +
  three placeholder routes; three Vitest projects + Playwright e2e;
  CI workflow; docs).
- Anything deferred from the original notes (no AWS context yet; no
  domain folders pre-created; no deploy pipeline) — pointers to where
  these will land in future plans.
- Any TODOs intentionally retained (with their reason).

### Move plan to `plans-done/`

```sh
mkdir -p docs/plans-done
git mv docs/plans/2026-05-09-sveltekit-scaffold docs/plans-done/2026-05-09-sveltekit-scaffold
```

(The directory `docs/plans-done/` was created empty in Phase 08; if it
doesn't exist, `mkdir -p` is fine.)

## Commit

STOP FOR HUMAN REVIEW. Propose the following commit message; commit only
after the user approves.

```
feat(scaffold): bootstrap sveltekit app with tokyo night theme

- pnpm + Turborepo + Husky/lint-staged; eslint/prettier configured to
  match skills-verifier conventions
- SvelteKit 2 + Svelte 5 (adapter-node), Tailwind v4 with Tokyo Night
  palette and Inter + JetBrains Mono fonts
- Provider-based DI (AsyncLocalStorage), per-request AppContext with
  Logger, Time, and Id services (Real + Fake variants)
- /health and /version endpoints
- shadcn-svelte primitives: Button, Card, Badge, Input, Tabs, Dialog
- AppHeader + ThemeToggle + LandingPage + Wallet/Verifier/Issuer
  placeholder routes
- Storybook 10 with addon-vitest; three Vitest projects (client/server/
  storybook) plus Playwright e2e smoke spec
- GitHub Actions CI running pnpm turbo check test
- Docs: architecture, design-system, style guide, AGENTS.md, README,
  MIT license
```

After human approval:

```sh
git add .
git commit -F /tmp/commit-msg.txt   # or -m with the heredoc form
```

Use the standard Conventional Commits format. Do **not** push without
explicit approval.

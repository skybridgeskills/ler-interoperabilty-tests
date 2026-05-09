# Phase 08 — Docs & repo polish

## Scope of phase

Land the documentation and per-repo polish that make this scaffold a
livable home for future contributors and AI agents. Copy the style guide
from `skills-verifier`, write the agent guide, write the README, write a
fresh `architecture.md` and `design-system.md` reflecting _this_ repo's
choices, license file, VS Code launch configs, the
`print-app-version.sh` script, `.env.example`, and a real `robots.txt`.

Files created in this phase:

- `docs/style/{README.md, philosophy.md, naming.md, factory-functions.md,
providers.md, schemas.md, file-organization.md, documentation.md}` —
  copied verbatim from `skills-verifier/docs/style/` with one targeted
  pass to fix repo-name references and outbound links.
- `AGENTS.md` — copied + retargeted (paths, repo name, examples).
- `README.md` — fresh, written for this repo.
- `docs/architecture.md` — fresh; covers the provider DI, request
  context, theme system, test harness.
- `docs/design-system.md` — fresh; documents the Tokyo Night palette,
  font stack, semantic tokens, and primitive set.
- `LICENSE` — MIT, copyright SkyBridge Skills.
- `.vscode/launch.json` — App: dev, Storybook.
- `.vscode/settings.json` — format-on-save with Prettier.
- `scripts/print-app-version.sh` — one-liner reading version from git
  tag + package.json.
- `.env.example` — already created in Phase 01; expand the comments.
- `static/robots.txt` — disallow all (this is a dev tool, not for
  search indexing day one). Replace if the project goes public.

## Code Organization Reminders

- Docs live under `docs/`. Plan + plans-done are the only date-prefixed
  subtrees.
- The style guide README lists the topic files; topic files are the
  authoritative source.
- `AGENTS.md` is the short pointer; full conventions live in
  `docs/style/`.
- The README describes purpose + setup + turbo commands; it does **not**
  duplicate the architecture doc.

## Style conventions

- Markdown: GitHub-flavored, atx-style headings (`# h1`, `## h2`),
  fenced code blocks with language tags.
- Cross-link liberally between docs; relative paths from each doc's
  location.
- The style guide files are copied near-verbatim; only fix repo-specific
  references (`skills-verifier` → `ler-interoperability-test-suite`,
  monorepo links, etc.). Do not rewrite content.
- This phase is documentation-only; no code beyond the
  `print-app-version.sh` script.

## Implementation Details

### `docs/style/`

Copy each file verbatim from
`/Users/notto/Projects/skybridgeskills/skills-verifier/docs/style/` to
`/Users/notto/Projects/skybridgeskills/ler-interoperability-test-suite/docs/style/`.

Pass:

- Replace `skills-verifier` → `ler-interoperability-test-suite` where it
  refers to _this_ repo.
- Drop or adjust references to monorepo helpers that don't exist here
  (per the skills-verifier README's existing caveat: "Some examples
  reference patterns or helpers that exist only in the monorepo").
- Update example paths if they referenced jobs/skills code that doesn't
  exist here. (Most examples are abstract — `UserService`,
  `EmailService` — and don't need adjustment.)

### `AGENTS.md`

Copy from skills-verifier, retarget repo name, and replace the "Where to
look for examples" table with paths that actually exist here:

| Pattern              | Example                                                              |
| -------------------- | -------------------------------------------------------------------- |
| Factory + ZodFactory | `src/lib/server/util/app-version.ts` (uses `VersionBody` ZodFactory) |
| ZodFactory helper    | `src/lib/server/util/zod-factory.ts`                                 |
| Providers            | `src/lib/server/util/provider/providers.ts`, `…/README.test.ts`      |
| Architecture         | `docs/architecture.md`                                               |

### `README.md`

Sections:

1. Title + 2-paragraph description (drawn from the
   00-notes.md scope).
2. Audience: who this is for (wallet/verifier/issuer implementers; not
   end-users of credentials).
3. Tech stack (bulleted: SvelteKit, TypeScript, Tailwind v4, Storybook,
   Vitest, Playwright, Turborepo, pnpm, shadcn-svelte, bits-ui, pino,
   zod).
4. Setup (`pnpm install` → `pnpm dev`).
5. Turbo commands (mirror skills-verifier's section but for the tasks
   this repo actually has).
6. Project structure (ASCII tree of `src/` only).
7. Theming (link to `docs/design-system.md`).
8. Architecture (link to `docs/architecture.md`).
9. Contributing (link to `docs/style/README.md` and `AGENTS.md`).
10. License: MIT.

### `docs/architecture.md`

Cover:

- High-level: SvelteKit (adapter-node) front and back; one
  AsyncLocalStorage-based AppContext per request.
- Provider DI walkthrough referencing
  `src/lib/server/util/provider/README.test.ts`.
- Service slice pattern (`Real…` + `Fake…` with provider).
- Where to add a new service (concrete steps).
- Where to add a new domain feature (`src/lib/server/domain/<feature>/`
  — note that no domain folders exist yet; first feature plan creates
  the first one).
- Theme system summary (CSS tokens + `@theme inline` + flash prevention
  - ThemeToggle cycle).
- Test harness (three Vitest projects + Playwright e2e).
- Pointers into `docs/style/`.

### `docs/design-system.md`

Cover:

- Palette: full Tokyo Night token table for both `:root` and `.dark`,
  with a "where this comes from" credit (Tokyo Night by enkia).
- Typography utilities (`text-display-lg`, `text-headline-md`,
  `text-title-lg`, `text-body-md`, `text-label-md`).
- Font stack (Inter + JetBrains Mono).
- Primitive set: list of generated shadcn-svelte primitives + Storybook
  links.
- ThemeToggle behavior.
- "How to add a new primitive": `pnpm dlx shadcn-svelte add <name>` →
  review variant strings → add story.

### `LICENSE`

Standard MIT text. Copyright holder: `SkyBridge Skills` (matches the
github org). Year: 2026.

### `.vscode/launch.json`

```jsonc
{
	"version": "0.2.0",
	"configurations": [
		{
			"name": "App: dev",
			"type": "node-terminal",
			"request": "launch",
			"command": "pnpm dev"
		},
		{
			"name": "Storybook",
			"type": "node-terminal",
			"request": "launch",
			"command": "pnpm storybook"
		}
	]
}
```

### `.vscode/settings.json`

```jsonc
{
	"editor.formatOnSave": true,
	"editor.defaultFormatter": "esbenp.prettier-vscode",
	"[svelte]": { "editor.defaultFormatter": "svelte.svelte-vscode" },
	"eslint.validate": ["javascript", "typescript", "svelte"]
}
```

### `scripts/print-app-version.sh`

```sh
#!/usr/bin/env bash
set -euo pipefail
git_tag=$(git describe --tags --always --dirty 2>/dev/null || echo "untagged")
pkg_version=$(node -p "require('./package.json').version")
echo "${pkg_version} (git ${git_tag})"
```

`chmod +x` it. Referenced by the `print-app-version` script in
`package.json` from Phase 01.

### `.env.example`

Update from the Phase 01 minimum to a documented example:

```
# CONTEXT controls which AppContext the server boots into.
#   dev  — pino-pretty logger, real time/id services
#   test — silent logger, deterministic time/id services
CONTEXT=dev

# pino log level (silent, error, warn, info, debug, trace)
LOG_LEVEL=info
```

### `static/robots.txt`

```
User-agent: *
Disallow: /
```

(Dev tool, not for indexing on day one. Adjust when the project becomes
public-facing.)

## Validate

```sh
pnpm turbo check
pnpm turbo test

# Manually:
pnpm print-app-version  # prints version + git tag
open docs/style/README.md
open docs/architecture.md
open docs/design-system.md
```

Visually:

- README renders cleanly on github.com (paste into the GitHub markdown
  preview if uncertain).
- All cross-links between docs resolve.
- LICENSE is in the repo root, recognized by GitHub.

DO NOT COMMIT between phases unless specifically requested.

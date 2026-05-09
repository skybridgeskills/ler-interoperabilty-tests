# Phase 01 — Bootstrap repo files & dependencies

## Scope of phase

Lay the ground floor. After this phase the repo has a `package.json`, a
locked dependency tree, working `pnpm dev` (renders a blank `+page.svelte`
placeholder), `pnpm turbo check` (passes — nothing to check yet beyond
prettier/eslint baselines), and the formatting/linting toolchain. No
domain code, no theme yet, no provider system yet. Subsequent phases
incrementally fill in the pieces.

Files created in this phase:

- `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` _(skipped per
  Q1 — single-package)_.
- `tsconfig.json`, `svelte.config.js`, `vite.config.ts` (Vitest projects
  filled in by Phase 04 — for now, just the bare Svelte/Tailwind plugin
  config so `pnpm dev` works).
- `eslint.config.js`, `.prettierrc`, `.prettierignore`,
  `.lintstagedrc.fast.json`.
- `.gitignore`, `.gitattributes`, `.npmrc`, `.nvmrc`, `.env.example`.
- `turbo.jsonc` covering `dev`, `build`, `check`, `fix`, `test`, `e2e`,
  `storybook`, `build:storybook`, `pre-commit`.
- `.husky/pre-commit` running `pnpm fix-staged-fast`.
- Stub `src/app.html`, `src/app.d.ts`, `src/routes/+page.svelte`,
  `src/routes/+layout.svelte`. **No** theme tokens / no Tailwind import
  yet — those land in Phase 03. The placeholder `+page.svelte` says
  "scaffold in progress".
- `src/hooks.server.ts` is **not** created here — Phase 02 owns it.

## Code Organization Reminders

- Prefer a granular file structure, one concept per file.
- Place more abstract things, entry points, and tests **first**.
- Place helper utility functions **at the bottom** of files.
- Keep related functionality grouped together.
- Any temporary code should have a TODO comment so we can find it later.
- The placeholder `+page.svelte` from this phase is temporary; Phase 06
  replaces it. Add a `// TODO(phase-06): replace with LandingPage` comment.

## Style conventions

- File names: `kebab-case`. Svelte components: `PascalCase.svelte`.
- Imports ordered external → `$lib/` → relative, alphabetized within
  groups (the lint config will enforce). Phase 01 has very little code so
  the rule mostly bites starting Phase 02.
- No classes; not relevant in Phase 01 but called out so the convention is
  set from the first commit.
- Phase 01 is tooling-only — no domain code, no providers, no Svelte
  beyond two stub files. Skip TSDoc in the stubs.

## Implementation Details

### `package.json`

Mirror skills-verifier's dependency set verbatim **except** drop
`@aws-sdk/*` (no DynamoDB on day one) and add nothing new yet. Update
`name` and the script set.

```jsonc
{
	"name": "ler-interoperability-test-suite",
	"private": true,
	"version": "0.0.0",
	"type": "module",
	"packageManager": "pnpm@10.22.0",
	"scripts": {
		"preview": "vite preview",
		"prepare": "husky && svelte-kit sync || echo ''",
		"print-app-version": "./scripts/print-app-version.sh",
		"build:svelte": "vite build",
		"build:storybook": "storybook build",
		"check:prettier": "prettier --check .",
		"check:eslint": "eslint .",
		"check:typescript": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
		"check:svelte": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
		"check:watch": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json --watch",
		"fix:prettier": "prettier --write .",
		"fix:eslint": "eslint . --fix",
		"fix-staged-fast": "lint-staged --config .lintstagedrc.fast.json",
		"test:vitest": "CONTEXT=test vitest run",
		"test:storybook": "vite optimize --force && vitest run --reporter=verbose --no-file-parallelism --no-coverage",
		"e2e:playwright": "playwright test",
		"storybook": "storybook dev -p 6006",
		"dev": "vite dev"
	}
}
```

`dependencies`: `clsx`, `pino`, `pino-pretty`, `tailwind-merge`, `zod`.

`devDependencies`: copy verbatim from skills-verifier `devDependencies`
(SvelteKit, Svelte 5, Vite 7, Vitest 4, Tailwind v4, Storybook 10,
bits-ui, tailwind-variants, lucide-svelte, iconify, prettier+plugins,
eslint+plugins, husky, lint-staged, playwright, turbo, etc.).

After writing `package.json`:

```sh
pnpm install
```

This generates `pnpm-lock.yaml`.

### `tsconfig.json`

Copy verbatim from skills-verifier:

```jsonc
{
	"extends": "./.svelte-kit/tsconfig.json",
	"compilerOptions": {
		"rewriteRelativeImportExtensions": true,
		"allowJs": true,
		"checkJs": true,
		"esModuleInterop": true,
		"forceConsistentCasingInFileNames": true,
		"resolveJsonModule": true,
		"skipLibCheck": true,
		"sourceMap": true,
		"strict": true,
		"moduleResolution": "bundler"
	}
}
```

### `svelte.config.js`

```js
import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({ out: 'build', precompress: false })
	}
};

export default config;
```

### `vite.config.ts`

Phase 01 ships a minimal version (Tailwind + SvelteKit plugins only, no
Vitest projects yet — Phase 04 fills the `test:` block):

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	ssr: { noExternal: ['colorette'] }
});
```

### `eslint.config.js`

Copy verbatim from skills-verifier (covers js + ts + svelte + import order

- unused-imports + prettier integration). Drop the
  `src/lib/components/ui/**` override — Phase 05 will reinstate it.

### `.prettierrc`, `.prettierignore`, `.gitignore`, `.gitattributes`,

`.npmrc`, `.nvmrc`

Copy verbatim from skills-verifier. (Inspect each first to confirm
nothing is repo-specific; they shouldn't be.)

### `.lintstagedrc.fast.json`

Copy verbatim. Should run prettier on staged files only.

### `.husky/pre-commit`

```sh
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
pnpm fix-staged-fast
```

`pnpm install` runs `prepare`, which calls `husky` and bootstraps
`.husky/_/`.

### `turbo.jsonc`

Copy from skills-verifier and trim to the tasks we have today: `dev`,
`build`, `build:svelte`, `build:storybook`, `check`, `check:prettier`,
`check:eslint`, `check:typescript`, `check:svelte`, `fix`, `fix:prettier`,
`fix:eslint`, `test`, `test:vitest`, `test:storybook`, `e2e`,
`e2e:playwright`, `storybook`, `pre-commit`, `fix-staged-fast`,
`validate` (= check + test + build).

### `.env.example`

```
CONTEXT=dev
LOG_LEVEL=info
```

### `src/app.html`

Plain SvelteKit shell. **No font links yet** — Phase 03 adds Inter +
JetBrains Mono.

```html
<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		%sveltekit.head%
	</head>
	<body data-sveltekit-preload-data="hover">
		<div style="display: contents">%sveltekit.body%</div>
	</body>
</html>
```

### `src/app.d.ts`

```ts
declare global {
	namespace App {
		interface Locals {
			requestId?: string;
		}
	}
}

export {};
```

### `src/routes/+layout.svelte`

Phase 01 ships a stub. Phase 03 adds the theme init script; Phase 06
mounts the AppHeader.

```svelte
<script lang="ts">
	// TODO(phase-03): import './layout.css' and theme init
	// TODO(phase-06): mount AppHeader
	let { children } = $props();
</script>

<main>{@render children()}</main>
```

### `src/routes/+page.svelte`

```svelte
<!-- TODO(phase-06): replace with LandingPage -->
<h1>LER Interoperability Test Suite</h1>
<p>Scaffold in progress.</p>
```

### `static/`

Create `static/` with an empty `robots.txt` (Phase 08 fills it). For now
just `# placeholder`.

## Validate

```sh
pnpm install
pnpm dev          # smoke check: blank page renders at http://localhost:5173
                  # (kill it; CI doesn't run dev)
pnpm turbo check  # prettier + eslint + svelte-check should pass
```

`pnpm turbo test` is **not** expected to pass yet — the Vitest project
config arrives in Phase 04. Skip it for this phase.

Clean up any prettier or ESLint warnings before moving on.

DO NOT COMMIT between phases unless specifically requested.

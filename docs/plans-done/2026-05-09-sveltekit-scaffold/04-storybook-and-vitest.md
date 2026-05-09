# Phase 04 — Storybook + Vitest integration

## Scope of phase

Wire up Storybook 10 (`@storybook/sveltekit`) and the Vitest integration
(`@storybook/addon-vitest`). Land three Vitest projects (`client` browser,
`server` node, `storybook` browser via Playwright Chromium). Ship the
`ThemeToggle` Storybook story (the dark-mode demo called out in the user
request). Demonstrate that `pnpm turbo test` runs all three projects
green.

Files created in this phase:

- `.storybook/{main.ts, preview.ts, vitest.setup.ts}`.
- `vite.config.ts` — replaced with the full three-project Vitest config.
- `src/lib/components/theme-toggle/ThemeToggle.stories.svelte` — the
  required dark-mode selection control story.
- `src/lib/storybook/{responsive-preview.svelte, index.ts}` — small util
  for stories that want to render at multiple widths.
- `src/routes/+page.svelte.spec.ts` — sample browser test (renders the
  page placeholder).

## Code Organization Reminders

- Stories live next to their components; no central `stories/` folder.
- Test helpers under `src/lib/storybook/` are exported via `index.ts`.
- `vite.config.ts` is one of the few files in the repo allowed to be
  longer than ~200 lines because the three-project Vitest config is
  inherently verbose; keep it tidy nonetheless and use named project
  blocks.

## Style conventions

- Story files: `<Component>.stories.svelte`. PascalCase matches the
  component file name. One exported `defineMeta()` block per story file;
  individual stories use `<Story name="...">…</Story>` blocks
  (`@storybook/addon-svelte-csf` v5).
- Browser tests: `*.svelte.{test,spec}.ts`; node tests: `*.{test,spec}.ts`
  (the file-suffix pattern is what splits them across Vitest projects).
- Imports follow the same external → `$lib/` → relative ordering.
- Phase 04 is configuration + one story + one browser spec. No domain
  code; provider/factory rules don't apply directly here.

## Implementation Details

### `vite.config.ts`

Replace the Phase 01 minimal version with the full three-project config
(mirrors skills-verifier exactly):

```ts
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	ssr: { noExternal: ['colorette'] },

	test: {
		expect: { requireAssertions: true },
		reporters: process.env.CI ? ['default', 'junit'] : ['default'],
		...(process.env.CI && {
			outputFile: { junit: './build/test-results/junit.xml' }
		}),
		coverage: {
			reporter: process.env.CI ? ['text', 'lcov', 'json'] : ['text'],
			reportsDirectory: './build/coverage'
		},

		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			},
			{
				extends: './vite.config.ts',
				plugins: [storybookTest({ configDir: path.join(__dirname, '.storybook') })],
				test: {
					name: 'storybook',
					testTimeout: 60000,
					expect: { requireAssertions: false },
					browser: {
						enabled: true,
						headless: true,
						provider: playwright(),
						instances: [{ browser: 'chromium' }]
					},
					setupFiles: ['.storybook/vitest.setup.ts']
				}
			}
		]
	}
});
```

### `.storybook/main.ts`

```ts
import type { StorybookConfig } from '@storybook/sveltekit';

const config: StorybookConfig = {
	stories: [
		'../src/routes/**/*.stories.@(js|ts|svelte)',
		'../src/lib/components/**/*.stories.@(js|ts|svelte)',
		'../src/lib/pages/**/*.stories.@(js|ts|svelte)'
	],
	addons: [
		'@storybook/addon-svelte-csf',
		'@storybook/addon-a11y',
		'@storybook/addon-docs',
		'@storybook/addon-vitest'
	],
	framework: { name: '@storybook/sveltekit', options: {} }
};

export default config;
```

### `.storybook/preview.ts`

```ts
import '../src/routes/layout.css';
import type { Preview } from '@storybook/sveltekit';

function applyTheme() {
	if (typeof window === 'undefined') return;
	const theme = localStorage.getItem('theme') || 'system';
	const html = document.documentElement;
	const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
	const resolved = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;
	html.classList.toggle('dark', resolved === 'dark');
}

if (typeof window !== 'undefined') {
	applyTheme();
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
		if ((localStorage.getItem('theme') || 'system') === 'system') applyTheme();
	});
}

const preview: Preview = {
	decorators: [],
	parameters: {
		controls: {
			matchers: { color: /(background|color)$/i, date: /date$/i }
		},
		a11y: { test: 'todo' }
	}
};

export default preview;
```

### `.storybook/vitest.setup.ts`

```ts
import * as a11yAddonAnnotations from '@storybook/addon-a11y/preview';
import { setProjectAnnotations } from '@storybook/sveltekit';

import * as projectAnnotations from './preview';

setProjectAnnotations([a11yAddonAnnotations, projectAnnotations]);
```

### `src/lib/storybook/responsive-preview.svelte`

Small helper for rendering a story across multiple breakpoints. Mirror
skills-verifier's version but trim to the essentials (~40 lines).

### `src/lib/storybook/index.ts`

```ts
export { default as ResponsivePreview } from './responsive-preview.svelte';
```

### `src/lib/components/theme-toggle/ThemeToggle.stories.svelte`

The user explicitly asked for a Storybook story demonstrating the dark
mode selection control. This is that story.

```svelte
<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { ThemeToggle } from './index.js';

	const { Story } = defineMeta({
		title: 'Components/ThemeToggle',
		component: ThemeToggle,
		parameters: {
			docs: {
				description: {
					component:
						'Cycles light → dark → system → light. Persists choice to ' +
						'localStorage and toggles `.dark` on `<html>`. The story reflects the ' +
						'current document theme; click the toggle to see the surrounding ' +
						'background and text adjust.'
				}
			}
		}
	});
</script>

<script lang="ts">
	function forceTheme(_node: HTMLElement, theme: 'light' | 'dark') {
		const prev = document.documentElement.classList.contains('dark');
		document.documentElement.classList.toggle('dark', theme === 'dark');
		return {
			destroy() {
				document.documentElement.classList.toggle('dark', prev);
			}
		};
	}
</script>

<Story name="Default">
	<div
		class="flex flex-col items-start gap-4 rounded-md border border-border bg-background p-6 text-foreground"
	>
		<p class="text-label-md text-muted-foreground">Theme toggle</p>
		<ThemeToggle />
		<p class="max-w-prose text-body-md">
			The button cycles through three states: <code class="font-mono">light</code>,
			<code class="font-mono">dark</code>, and
			<code class="font-mono">system</code>. The choice is persisted in
			<code class="font-mono">localStorage.theme</code> and applied by toggling the
			<code class="font-mono">.dark</code>
			class on <code class="font-mono">&lt;html&gt;</code>.
		</p>
	</div>
</Story>

<Story name="Forced light">
	<div class="rounded-md border border-border bg-background p-6 text-foreground">
		<p class="mb-4 text-label-md text-muted-foreground">
			Story-scoped: removes <code class="font-mono">.dark</code> on mount; the button still toggles, but
			the surrounding surface is forced to the light palette.
		</p>
		<div use:forceTheme={'light'}>
			<ThemeToggle />
		</div>
	</div>
</Story>

<Story name="Forced dark">
	<div class="rounded-md border border-border bg-background p-6 text-foreground">
		<p class="mb-4 text-label-md text-muted-foreground">
			Story-scoped: forces <code class="font-mono">.dark</code> on mount; the surrounding surface uses
			the Tokyo Night dark palette.
		</p>
		<div use:forceTheme={'dark'}>
			<ThemeToggle />
		</div>
	</div>
</Story>
```

### `src/routes/+page.svelte.spec.ts`

A tiny browser test to confirm the client Vitest project is wired:

```ts
import { render, screen } from 'vitest-browser-svelte';
import { describe, it, expect } from 'vitest';

import Page from './+page.svelte';

describe('+page.svelte', () => {
	it('renders the placeholder heading', () => {
		render(Page);
		expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(
			'LER Interoperability Test Suite'
		);
	});
});
```

(Replace once Phase 06 lands `LandingPage`.)

### Lint config update

Add the `src/lib/components/ui/**` Svelte navigation override block back
into `eslint.config.js` _now_ (even though the directory doesn't exist
yet) so Phase 05 can drop primitives in without re-touching ESLint. Mark
with a TODO if it bothers you; otherwise leave a one-line comment
explaining it's anticipating shadcn-svelte primitives.

## Validate

```sh
pnpm turbo check        # all clean
pnpm turbo test         # runs client + server + storybook projects
pnpm storybook          # opens at :6006; ThemeToggle story visible under
                        # Components/ThemeToggle with Default/Forced
                        # light/Forced dark variants.
```

`pnpm test:storybook` should exercise every story exactly as `pnpm turbo
test`'s `storybook` project does. Confirm both pass.

Storybook loads `routes/layout.css`, so the Tokyo Night tokens are in
play and the palette is visible behind the toggle in all three stories.

Clean up any warnings before moving on.

DO NOT COMMIT between phases unless specifically requested.

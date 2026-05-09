# Phase 03 — Theme system & Tokyo Night palette

## Scope of phase

Land the visual identity. Add the Tokyo Night palette via `:root` + `.dark`
CSS custom properties; expose them as Tailwind utility tokens via
`@theme inline`; load Inter + JetBrains Mono; ship a `ThemeToggle`
component that cycles light → dark → system; prevent flash of
unstyled content. The theme-toggle Storybook story is created in Phase 04
once Storybook itself is wired (this phase produces the **component**;
Phase 04 produces the **story**).

Files created in this phase:

- `src/routes/layout.css` — full Tailwind import + plugins + Tokyo Night
  tokens + typography utilities + base layer.
- `src/app.html` — adds Inter + JetBrains Mono Google Fonts links and
  the inline pre-paint theme script.
- `src/routes/+layout.svelte` — imports `layout.css`, mounts the
  on-mount theme initialization (mirrors skills-verifier).
- `src/lib/components/theme-toggle/{ThemeToggle.svelte, index.ts}`
  (story added in Phase 04).
- `src/lib/utils.ts` — `cn()` helper (clsx + tailwind-merge).

## Code Organization Reminders

- One concept per file. The theme-toggle directory holds only
  `ThemeToggle.svelte` + `index.ts`. The `*.stories.svelte` is added by
  Phase 04 when Storybook ships.
- TODO comments for the planned story (so it's findable when Phase 04
  arrives).
- Place high-level component logic first; types and helpers at the
  bottom.

## Style conventions

- Svelte components: `PascalCase.svelte` matching the component name.
- Imports: external → `$lib/` → relative; alphabetized; lint will enforce.
- `$state`, `$props`, `$effect`, `$derived` runes (Svelte 5) are the
  default; do not use legacy stores or `let` reactivity except where the
  Svelte compiler still requires it.
- This phase touches CSS + a single Svelte component; no providers,
  schemas, or factories needed. The provider system / DI rules don't
  apply here.

## Implementation Details

### `src/lib/utils.ts`

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
```

### `src/routes/layout.css`

```css
@import 'tailwindcss';
@import 'tw-animate-css';
@plugin '@tailwindcss/typography';
@plugin '@tailwindcss/forms';
@plugin '@iconify/tailwind4';

@custom-variant dark (&&:is(.dark *));

/* Tokyo Night — light surface */
:root {
	--background: hsl(220 23% 95%);
	--foreground: hsl(234 16% 13%);
	--card: hsl(220 22% 92%);
	--card-foreground: hsl(234 16% 13%);
	--popover: hsl(220 22% 92%);
	--popover-foreground: hsl(234 16% 13%);
	--primary: hsl(217 87% 45%);
	--primary-foreground: hsl(0 0% 100%);
	--secondary: hsl(220 16% 86%);
	--secondary-foreground: hsl(234 16% 13%);
	--muted: hsl(220 16% 88%);
	--muted-foreground: hsl(232 10% 35%);
	--accent: hsl(261 60% 55%);
	--accent-foreground: hsl(0 0% 100%);
	--warning: hsl(35 75% 40%);
	--warning-foreground: hsl(0 0% 100%);
	--destructive: hsl(350 70% 45%);
	--destructive-foreground: hsl(0 0% 100%);
	--border: hsl(220 13% 78%);
	--input: hsl(220 13% 78%);
	--ring: hsl(217 87% 45%);
	--chart-1: hsl(217 87% 45%);
	--chart-2: hsl(261 60% 55%);
	--chart-3: hsl(180 70% 35%);
	--chart-4: hsl(35 75% 40%);
	--chart-5: hsl(350 70% 45%);
	--radius: 0.5rem;
}

/* Tokyo Night — dark surface (primary) */
.dark {
	--background: hsl(234 16% 13%);
	--foreground: hsl(230 73% 86%);
	--card: hsl(232 17% 17%);
	--card-foreground: hsl(230 73% 86%);
	--popover: hsl(232 17% 17%);
	--popover-foreground: hsl(230 73% 86%);
	--primary: hsl(217 87% 73%);
	--primary-foreground: hsl(234 16% 13%);
	--secondary: hsl(231 13% 23%);
	--secondary-foreground: hsl(230 73% 86%);
	--muted: hsl(231 12% 20%);
	--muted-foreground: hsl(229 28% 70%);
	--accent: hsl(261 84% 78%);
	--accent-foreground: hsl(234 16% 13%);
	--warning: hsl(35 65% 64%);
	--warning-foreground: hsl(234 16% 13%);
	--destructive: hsl(350 89% 71%);
	--destructive-foreground: hsl(234 16% 13%);
	--border: hsl(231 12% 25%);
	--input: hsl(231 12% 25%);
	--ring: hsl(217 87% 73%);
	--chart-1: hsl(217 87% 73%);
	--chart-2: hsl(261 84% 78%);
	--chart-3: hsl(180 70% 65%);
	--chart-4: hsl(35 65% 64%);
	--chart-5: hsl(350 89% 71%);
}

@theme inline {
	--radius-sm: calc(var(--radius) - 4px);
	--radius-md: calc(var(--radius) - 2px);
	--radius-lg: var(--radius);
	--radius-xl: calc(var(--radius) + 4px);

	--color-background: var(--background);
	--color-foreground: var(--foreground);
	--color-card: var(--card);
	--color-card-foreground: var(--card-foreground);
	--color-popover: var(--popover);
	--color-popover-foreground: var(--popover-foreground);
	--color-primary: var(--primary);
	--color-primary-foreground: var(--primary-foreground);
	--color-secondary: var(--secondary);
	--color-secondary-foreground: var(--secondary-foreground);
	--color-muted: var(--muted);
	--color-muted-foreground: var(--muted-foreground);
	--color-accent: var(--accent);
	--color-accent-foreground: var(--accent-foreground);
	--color-warning: var(--warning);
	--color-warning-foreground: var(--warning-foreground);
	--color-destructive: var(--destructive);
	--color-destructive-foreground: var(--destructive-foreground);
	--color-border: var(--border);
	--color-input: var(--input);
	--color-ring: var(--ring);
	--color-chart-1: var(--chart-1);
	--color-chart-2: var(--chart-2);
	--color-chart-3: var(--chart-3);
	--color-chart-4: var(--chart-4);
	--color-chart-5: var(--chart-5);

	--font-sans:
		'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
		sans-serif;
	--font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

@utility text-display-lg {
	font-size: 3rem;
	line-height: 1.1;
	letter-spacing: -0.02em;
	font-weight: 700;
	font-family: var(--font-mono);
}

@utility text-headline-md {
	font-size: 1.75rem;
	line-height: 1.3;
	letter-spacing: -0.01em;
	font-weight: 600;
	font-family: var(--font-mono);
}

@utility text-title-lg {
	font-size: 1.25rem;
	line-height: 1.4;
	font-weight: 600;
}

@utility text-body-md {
	font-size: 0.875rem;
	line-height: 1.5;
	font-weight: 400;
}

@utility text-label-md {
	font-size: 0.75rem;
	line-height: 1.4;
	letter-spacing: 0.05em;
	font-weight: 500;
	text-transform: uppercase;
	font-family: var(--font-mono);
}

@utility shadow-ambient {
	box-shadow: 0 12px 32px hsl(234 16% 5% / 0.4);
}

@layer base {
	* {
		@apply border-border;
	}

	body {
		@apply bg-background font-sans text-foreground antialiased;
	}

	code,
	pre,
	kbd {
		@apply font-mono;
	}
}
```

### `src/app.html`

Replace Phase 01's stub with the Inter + JetBrains Mono links and the
inline flash-prevention script:

```html
<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<link rel="preconnect" href="https://fonts.googleapis.com" />
		<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
		<link
			href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=JetBrains+Mono:wght@400;500;700&display=swap"
			rel="stylesheet"
		/>
		<script>
			// Apply persisted theme before paint.
			(function () {
				try {
					var theme = localStorage.getItem('theme') || 'system';
					var html = document.documentElement;
					var prefersDark =
						window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
					var resolved = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;
					if (resolved === 'dark') html.classList.add('dark');
					else html.classList.remove('dark');
				} catch (_) {
					/* localStorage may be unavailable; default to light */
				}
			})();
		</script>
		%sveltekit.head%
	</head>
	<body data-sveltekit-preload-data="hover">
		<div style="display: contents">%sveltekit.body%</div>
	</body>
</html>
```

### `src/routes/+layout.svelte`

Replace the Phase 01 stub:

```svelte
<script lang="ts">
	import { onMount } from 'svelte';

	import './layout.css';

	// TODO(phase-06): mount AppHeader

	let { children } = $props();

	onMount(() => {
		if (typeof window === 'undefined') return;

		const apply = () => {
			const theme = localStorage.getItem('theme') || 'system';
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			const resolved = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;
			document.documentElement.classList.toggle('dark', resolved === 'dark');
		};
		apply();

		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		mq.addEventListener('change', () => {
			if ((localStorage.getItem('theme') || 'system') === 'system') apply();
		});
	});
</script>

<main class="@container mx-auto max-w-7xl px-4 py-12">{@render children()}</main>
```

### `src/lib/components/theme-toggle/ThemeToggle.svelte`

Mirror skills-verifier's component (sun/moon SVGs, `light → dark →
system → light` cycle, `localStorage` persistence, system-preference
listener). Use a plain `<button>` for now (Phase 05 will swap it for the
shadcn `Button` once that primitive exists):

```svelte
<script lang="ts">
	import { onMount } from 'svelte';

	type Theme = 'light' | 'dark' | 'system';

	let currentTheme = $state<Theme>('system');
	let resolvedTheme = $state<'light' | 'dark'>('light');

	function getSystemTheme(): 'light' | 'dark' {
		if (typeof window === 'undefined') return 'light';
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}

	function applyTheme(theme: 'light' | 'dark') {
		if (typeof document === 'undefined') return;
		document.documentElement.classList.toggle('dark', theme === 'dark');
		resolvedTheme = theme;
	}

	function setTheme(theme: Theme) {
		currentTheme = theme;
		if (typeof window !== 'undefined') {
			localStorage.setItem('theme', theme);
		}
		applyTheme(theme === 'system' ? getSystemTheme() : theme);
	}

	function toggleTheme() {
		if (currentTheme === 'light') setTheme('dark');
		else if (currentTheme === 'dark') setTheme('system');
		else setTheme('light');
	}

	onMount(() => {
		const saved = (
			typeof window !== 'undefined' ? localStorage.getItem('theme') : null
		) as Theme | null;
		setTheme(saved ?? 'system');

		if (typeof window !== 'undefined') {
			const mq = window.matchMedia('(prefers-color-scheme: dark)');
			const onChange = () => {
				if (currentTheme === 'system') applyTheme(getSystemTheme());
			};
			mq.addEventListener('change', onChange);
			return () => mq.removeEventListener('change', onChange);
		}
	});
</script>

<button
	type="button"
	class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
	aria-label={`Toggle theme (current: ${currentTheme})`}
	onclick={toggleTheme}
>
	{#if resolvedTheme === 'dark'}
		<!-- Sun -->
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="4" />
			<path d="M12 2v2" /><path d="M12 20v2" />
			<path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" />
			<path d="M2 12h2" /><path d="M20 12h2" />
			<path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
		</svg>
	{:else}
		<!-- Moon -->
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
		</svg>
	{/if}
</button>

<!-- TODO(phase-04): add ThemeToggle.stories.svelte once Storybook is wired -->
```

### `src/lib/components/theme-toggle/index.ts`

```ts
export { default as ThemeToggle } from './ThemeToggle.svelte';
```

### `src/routes/+page.svelte`

Phase 03 keeps the placeholder, but now it can show palette tokens — useful
to confirm the tokens render. Phase 06 replaces it.

```svelte
<!-- TODO(phase-06): replace with LandingPage -->
<h1 class="text-headline-md">LER Interoperability Test Suite</h1>
<p class="text-body-md text-muted-foreground">Theme + tokens scaffolded.</p>
```

## Validate

```sh
pnpm dev
# Open http://localhost:5173.
# Light mode: cool slate background, dark text.
# Click the OS dark-mode toggle (or the in-page ThemeToggle once it's
# mounted in Phase 06): page flips to deep navy with light foreground.
# Reload: theme persists. No flash of unstyled content.

pnpm turbo check
```

Manual checks:

- Inter renders for body text; JetBrains Mono renders for headlines.
- Hard-refresh in dark mode → no white flash before paint.
- `localStorage.theme` updates as you click the toggle.

`pnpm turbo test` is still expected to fail (Vitest projects land in
Phase 04). Skip.

Clean up any warnings before moving on.

DO NOT COMMIT between phases unless specifically requested.

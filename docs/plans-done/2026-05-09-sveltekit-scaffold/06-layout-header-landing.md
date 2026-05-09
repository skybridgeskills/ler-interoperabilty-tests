# Phase 06 — Layout, AppHeader, landing & placeholder pages

## Scope of phase

Compose the things from prior phases into the user-visible app. After
this phase, opening `pnpm dev` shows a landing page describing the
project's purpose with three nav cards; the `AppHeader` is mounted on
every route with the brand mark, three nav links (Wallet / Verifier /
Issuer), and `ThemeToggle`; each placeholder page renders a "coming
soon" body.

Files created in this phase:

- `src/lib/components/app-header/{AppHeader.svelte, index.ts, AppHeader.stories.svelte}`.
- `src/lib/pages/{LandingPage.svelte, LandingPage.stories.svelte}`.
- `src/routes/+page.svelte` — replaced (renders `LandingPage`).
- `src/routes/wallet/+page.svelte`, `src/routes/verifier/+page.svelte`,
  `src/routes/issuer/+page.svelte` — placeholder "coming soon" pages
  using a shared inline `<ComingSoon>` snippet _or_ a small
  `src/lib/components/coming-soon/ComingSoon.svelte` if duplication
  bothers us (decide during implementation; default: shared component).
- `src/routes/+layout.svelte` — updated to mount `AppHeader`.
- `src/lib/assets/favicon.svg` — simple monogram (e.g. `LIT` in Tokyo
  Night blue on dark, swappable at any time).

## Code Organization Reminders

- Pages live under `src/lib/pages/` (per skills-verifier convention) so
  they can be exercised in Storybook independently of routing.
- Route files (`+page.svelte`, `+layout.svelte`) stay thin: they import
  the page component from `$lib/pages/` and render it.
- Cross-route placeholders: extract `ComingSoon.svelte` once we have two
  callers; rule of three otherwise. We'll have three placeholder pages,
  so extract.
- `AppHeader` is a single concept; one component file plus story.

## Style conventions

- Svelte 5 runes (`$props`, `$state`, `$derived`) where reactivity is
  needed.
- `cn()` from `$lib/utils.ts` for class merges.
- Prefer the shadcn `Button` and `Card` primitives over hand-rolled
  Tailwind for nav and landing cards.
- Headings use `text-display-lg` / `text-headline-md` utilities (which
  are JetBrains Mono per Phase 03's `@theme inline` mapping).
- Imports follow external → `$lib/` → relative.

## Implementation Details

### `src/lib/components/app-header/AppHeader.svelte`

```svelte
<script lang="ts">
	import { resolve } from '$app/paths';

	import { ThemeToggle } from '$lib/components/theme-toggle/index.js';
</script>

<header
	class="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
>
	<div class="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
		<a href={resolve('/')} class="flex items-center gap-2">
			<span class="text-headline-md leading-none text-primary">LIT</span>
			<span class="text-label-md text-muted-foreground">Suite</span>
		</a>

		<nav class="flex items-center gap-4 text-body-md">
			<a href={resolve('/wallet')} class="text-foreground hover:text-primary">Wallet</a>
			<a href={resolve('/verifier')} class="text-foreground hover:text-primary">Verifier</a>
			<a href={resolve('/issuer')} class="text-foreground hover:text-primary">Issuer</a>
		</nav>

		<div class="ml-auto">
			<ThemeToggle />
		</div>
	</div>
</header>
```

(The `text-foreground` class on links + `:hover` to `text-primary` is the
default expectation; replace with `aria-current` styling if/when Phase 07
or later adds active-route awareness.)

### `src/lib/components/app-header/AppHeader.stories.svelte`

One story showing the header in isolation; one within a `<main>`-style
shell so the sticky behavior is visible while scrolling.

### `src/lib/pages/LandingPage.svelte`

```svelte
<script lang="ts">
	import { resolve } from '$app/paths';

	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
</script>

<section class="space-y-4">
	<h1 class="text-display-lg">LER Interoperability Test Suite</h1>
	<p class="max-w-prose text-body-md text-muted-foreground">
		A self-help kit for developers building wallets, verifiers, and issuers for Open Badges
		credentials and other Learning &amp; Employment Records. Run interop checks against your stack,
		browse fixtures, and verify your implementations behave the way other ecosystem participants
		expect.
	</p>
</section>

<section class="mt-12 grid gap-6 md:grid-cols-3">
	<a href={resolve('/wallet')} class="block">
		<Card class="transition hover:border-primary">
			<CardHeader>
				<CardTitle>Wallet</CardTitle>
				<CardDescription>Acceptance and presentation flows for credential wallets.</CardDescription>
			</CardHeader>
			<CardContent>
				<p class="text-body-md text-muted-foreground">Coming soon.</p>
			</CardContent>
		</Card>
	</a>

	<a href={resolve('/verifier')} class="block">
		<Card class="transition hover:border-primary">
			<CardHeader>
				<CardTitle>Verifier</CardTitle>
				<CardDescription>Conformance checks for verifier implementations.</CardDescription>
			</CardHeader>
			<CardContent>
				<p class="text-body-md text-muted-foreground">Coming soon.</p>
			</CardContent>
		</Card>
	</a>

	<a href={resolve('/issuer')} class="block">
		<Card class="transition hover:border-primary">
			<CardHeader>
				<CardTitle>Issuer</CardTitle>
				<CardDescription>Self-checks and round-trip fixtures for issuers.</CardDescription>
			</CardHeader>
			<CardContent>
				<p class="text-body-md text-muted-foreground">Coming soon.</p>
			</CardContent>
		</Card>
	</a>
</section>
```

### `src/lib/pages/LandingPage.stories.svelte`

Single "Default" story rendering the page; verifies it looks right under
both themes.

### `src/lib/components/coming-soon/ComingSoon.svelte`

Tiny reusable shell for the three placeholder pages.

```svelte
<script lang="ts">
	let { title, blurb }: { title: string; blurb: string } = $props();
</script>

<section class="space-y-4">
	<h1 class="text-headline-md">{title}</h1>
	<p class="max-w-prose text-body-md text-muted-foreground">{blurb}</p>
	<p class="text-label-md text-accent">Coming soon</p>
</section>
```

(`index.ts` re-exports it.)

### Routes

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
	import LandingPage from '$lib/pages/LandingPage.svelte';
</script>

<LandingPage />
```

```svelte
<!-- src/routes/wallet/+page.svelte -->
<script lang="ts">
	import { ComingSoon } from '$lib/components/coming-soon/index.js';
</script>

<ComingSoon
	title="Wallet test suite"
	blurb="Tools for credential wallets to validate acceptance, storage, presentation, and revocation flows against ecosystem expectations."
/>
```

(Same shape for `verifier/` and `issuer/` with their own copy.)

### `src/routes/+layout.svelte`

Replace Phase 03's stub with the version that mounts `AppHeader`:

```svelte
<script lang="ts">
	import { onMount } from 'svelte';

	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { AppHeader } from '$lib/components/app-header/index.js';

	let { children } = $props();

	onMount(() => {
		/* same theme-init code as Phase 03 */
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>LER Interoperability Test Suite</title>
</svelte:head>

<AppHeader />
<main class="@container mx-auto max-w-7xl px-4 py-12">{@render children()}</main>
```

### Tests

- `src/routes/+page.svelte.spec.ts` — already present from Phase 04;
  update the assertion to match the new heading copy.
- `src/lib/pages/LandingPage.svelte.spec.ts` — new browser test:
  asserts the three nav cards (`Wallet` / `Verifier` / `Issuer`) render
  and link to the right paths.

## Validate

```sh
pnpm dev                # http://localhost:5173 — landing page renders
                        # with three cards, header is sticky, theme toggle
                        # cycles light → dark → system. Click Wallet,
                        # Verifier, Issuer; each opens a "Coming soon" page
                        # with the header still mounted.

pnpm turbo check
pnpm turbo test         # client browser tests pass; storybook stories
                        # all green; server tests still green.
pnpm storybook          # AppHeader and LandingPage stories visible.
```

Visual check both themes:

- Light mode: pale slate background, dark slate text, blue primary cards.
- Dark mode: navy `hsl(234 16% 13%)` background, light periwinkle text,
  brighter blue primary, magenta accent for the "Coming soon" label.

Clean up any warnings before moving on.

DO NOT COMMIT between phases unless specifically requested.

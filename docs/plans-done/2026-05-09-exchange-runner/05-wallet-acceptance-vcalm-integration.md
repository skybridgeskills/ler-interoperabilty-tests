# Phase 5 — Wire up wallet-acceptance × VCALM-EdDSA

## Scope of phase

Replace the prerendered static checklist at
`/wallet/credential-acceptance/vcalm-eddsa` with a `RunnableChecklist`
that calls the live transaction service. End-to-end: a developer runs
`pnpm turbo dev:full`, opens the route, clicks the CTA, scans the QR
with their wallet under test, and watches the right column update.

Other 9 routes are unchanged.

## Code Organization Reminders

- The route under `src/routes/wallet/credential-acceptance/vcalm-eddsa/`
  shadows the dynamic `/[role]/[workflow]/[profile]` route specifically
  for this combination. SvelteKit picks the more specific route.
- The page component itself lives in
  `src/lib/pages/runnable-wallet-acceptance/RunnableWalletAcceptancePage.svelte`
  so storybook can render it on a Pages-section story.
- The route file is a thin shim that loads the static checklist data and
  renders the page component.

## Style conventions

- Server-only auth secret stays in server endpoints; never re-exposed.
- Browser-side state via Svelte 5 runes.
- Tailwind utilities only.
- Imports: external → `$lib/` → relative.
- Disable prerender for this specific route (it depends on a live
  service); keep the dynamic route prerender intact for the other 9.

## Implementation Details

### `src/lib/pages/runnable-wallet-acceptance/RunnableWalletAcceptancePage.svelte`

```svelte
<script lang="ts">
	import { RunnableChecklist } from '$lib/components/interop/runnable-checklist';
	import { ExchangeRunnerPanel } from '$lib/components/interop/exchange-runner';
	import { combinationFor, roleBySlug, workflowBySlug } from '$lib/interop';

	const role = roleBySlug('wallet')!;
	const workflow = workflowBySlug('credential-acceptance')!;
	const combo = combinationFor('wallet', 'credential-acceptance', 'vcalm-eddsa')!;
</script>

<RunnableChecklist checklist={combo.checklist} profile={combo.profile} {workflow} {role}>
	{#snippet topOfPage()}
		<!-- subtle "live tools available" banner -->
	{/snippet}

	{#snippet rightColumn({ stepIndex })}
		<ExchangeRunnerPanel.Step {stepIndex} steps={combo.checklist.steps} />
	{/snippet}
</RunnableChecklist>
```

(The exact snippet shape may evolve in phase 4. The principle: this
page does no fetching itself; `ExchangeRunnerPanel` owns it.)

### Route file

```svelte
<!-- src/routes/wallet/credential-acceptance/vcalm-eddsa/+page.svelte -->
<script lang="ts">
	import { RunnableWalletAcceptancePage } from '$lib/pages/runnable-wallet-acceptance';
</script>

<RunnableWalletAcceptancePage />
```

```ts
// src/routes/wallet/credential-acceptance/vcalm-eddsa/+page.ts
export const prerender = false; // depends on live transaction service
```

This shadowing approach removes this combo from the dynamic route's
`entries()` list **automatically** because SvelteKit prefers the more
specific route. Verify after wiring by running `pnpm turbo build` and
inspecting `build/prerendered/`.

If SvelteKit still tries to prerender the same combo via the dynamic
route, exclude it explicitly from `entries()` in
`src/routes/wallet/[workflow]/[profile]/+page.ts`:

```ts
export const entries = () =>
	checklistEntriesFor('wallet').filter(
		(e) => !(e.workflow === 'credential-acceptance' && e.profile === 'vcalm-eddsa')
	);
```

### `RunnableWalletAcceptancePage.stories.svelte`

A single story showing the idle state with mock data (no real fetch).
Other states are already covered in `RunnableChecklist.stories.svelte`.

### Disabled-runner fallback

If `EXCHANGE_RUNNER_ENABLED=false` (the default), the page should still
load and render a static-ish layout pointing developers at
`docker/README.md`. The simplest implementation: ExchangeRunnerPanel
checks a tiny `/api/exchange-runner/status` endpoint (or just attempts
the CTA and surfaces the 503 response from `create/+server.ts`) and
renders a friendly disabled-state message instead of the CTA.

Decide during implementation whether to add a third endpoint or just
react to the 503. The 503 path is simpler and adequate for v1.

## Validate

```
pnpm turbo check
pnpm turbo test
pnpm turbo build  # confirms the shadowed route is correctly prerender-disabled
```

End-to-end manual:

1. Configure `.env` with secrets per the runbook.
2. `pnpm turbo dev:full`.
3. Open `http://localhost:5173/wallet/credential-acceptance/vcalm-eddsa`.
4. Click "Initiate exchange". QR + copy URL appear on the right.
5. Open the interaction URL in a browser tab (or scan with a
   wallet-under-test). The right column should reflect the wallet's
   progress and finish at "Complete" with a credential summary.
6. Test the failure path: stop the transaction-service container,
   click "Initiate exchange" again, confirm the inline error +
   retry button.

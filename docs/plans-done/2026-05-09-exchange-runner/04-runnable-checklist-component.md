# Phase 4 — `RunnableChecklist` component + storybook

## Scope of phase

Build the new split-layout component family that the wallet-acceptance ×
VCALM page will adopt next phase. Storybook story coverage for all four
states (Idle, Awaiting wallet, Success, Error). All UI built against
mock state — no real service calls.

## Code Organization Reminders

- Each component in its own folder with `Component.svelte`,
  `Component.stories.svelte`, and `index.ts`.
- One concept per file. Helpers under ~200 lines.
- The `RunnableChecklist` is a _layout_ component. It accepts the same
  static checklist data as `WorkflowChecklist` plus a render snippet
  that draws the right column.
- The `ExchangeRunnerPanel` is the **only** caller of the right column
  in this plan; it gets its own folder + stories.

## Style conventions

- Svelte 5 runes (`$props`, `$state`, `$derived`, snippets).
- shadcn-svelte primitives where practical. Pull in
  [`Skeleton`](https://shadcn-svelte.com/docs/components/skeleton) via
  the CLI for placeholder bars on the right column.
- Tailwind utilities only. Use the new `live` tokens (`bg-live-soft`,
  `text-live`, `border-live`) for any "live" surface.
- All `<Story>` blocks use `asChild`.
- Imports: external → `$lib/` → relative.

## Implementation Details

### `RunnableChecklist`

Props:

```ts
{
  checklist: WorkflowChecklist;
  profile: Profile;
  workflow: Workflow;
  role: Role;
  rightColumn: Snippet<[{ stepIndex: number; stepRunState: StepRunState }]>;
  topOfPage?: Snippet;       // optional CTA / banner above the grid
  globalRunState?: ChecklistRunState; // affects header chip
  perStep?: StepRunState[];  // run state per step (length === steps.length)
}
```

Layout (Tailwind):

```
<section> top-of-page snippet (CTA / status banner)
<section> two-column grid:
  left  (lg:col-span-2): identical to WorkflowChecklist content (heading,
        ordered steps, requirements). Steps render with a left margin so
        the right column aligns row-by-row with each step.
  right (lg:col-span-3): an <ol> matching the step count where each <li>
        renders the `rightColumn` snippet for that index. Background
        uses `bg-live-soft`-tinted card to signal "this is the live
        column". On viewports < lg, right column stacks under the left.
```

Use CSS subgrid (or simple grid alignment with matching `<ol>` heights)
so step N on the left visually aligns with step N on the right. If
subgrid isn't viable in the target Tailwind config, fall back to a
predictable per-step row height.

### `ExchangeRunnerPanel`

Top-level orchestrator for the right column. Owns the runner state.

Props:

```ts
{
  steps: ChecklistStep[];   // from the checklist
  // plus internal $state: { runState, exchange, error, polling }
}
```

Internals:

- `$state` holds the exchange info + polling status.
- `idle` → renders the CTA (`Button variant="default"` filled with
  `bg-live`).
- After CTA click → calls `POST /api/exchange-runner/create`, transitions
  to `awaiting-wallet`, renders `<InteractionQrCard>` plus per-step
  `<StepRunStateIndicator>`.
- Starts `pollExchange()`; updates `$state` on each tick.
- On `complete` → renders success summary (credential id, timestamps).
- On error → renders the inline error banner with retry button.

Exposes a snippet `rightColumn(stepIndex)` that the parent
`RunnableChecklist` calls per step.

### `InteractionQrCard`

Props: `{ interactionUrl: string }`.

Renders:

- A QR code (rendered via `renderQr(interactionUrl)` which dynamically
  imports `qrcode` and produces an SVG string).
- An `Input` (read-only) with the URL + a copy button. Copy uses
  `navigator.clipboard.writeText`.
- A small "Open in browser" link as a sibling.

State: while QR is loading, render a `Skeleton` of the same dimensions.
A `text-live` ring around the QR signals it's the live artifact.

### `StepRunStateIndicator`

Props: `{ state: StepRunState; label?: string }`.

Tiny chip:

- `pending` → muted dot + "Pending"
- `in-flight` → pulsing `bg-live` dot + "In progress"
- `complete` → check icon + "Done"
- `skipped` → strikethrough + "Skipped"

Use shadcn-svelte `Badge` with the `live` variant if we add one;
otherwise a small inline span with Tailwind.

### Storybook stories

`RunnableChecklist.stories.svelte` — four stories with `asChild`. Each
uses mock data:

- **Idle** — `globalRunState='idle'`, `perStep=[pending×N]`. Right
  column shows the "Initiate exchange" CTA + helpful copy. No QR.
- **Awaiting wallet** — `globalRunState='awaiting-wallet'`, step 1
  in-flight, others pending. Right column shows the QR + copy URL +
  step indicators.
- **Success** — `globalRunState='complete'`, all steps complete. Right
  column shows credential summary: subject, issuer, issued-at.
- **Error / unreachable** — `globalRunState='error'`. Right column
  shows the inline error message + retry button + hint to run
  `pnpm turbo dev:full`.

`ExchangeRunnerPanel.stories.svelte` — one story per state, also using
mock data (no fetch calls).

`InteractionQrCard.stories.svelte` — one story with a fixed URL.

`StepRunStateIndicator.stories.svelte` — one story showing all four
states side-by-side.

### shadcn pulls

Run `pnpm dlx shadcn-svelte@latest add skeleton` (or whatever the
project's CLI invocation is). Verify the new file lives under
`src/lib/components/ui/skeleton/` matching existing conventions.

## Validate

```
pnpm turbo check
pnpm turbo test
pnpm turbo storybook  # eyeball all four states in light + dark
```

`check` and `test` must pass. The storybook eyeball checks visual
quality of the new layout.

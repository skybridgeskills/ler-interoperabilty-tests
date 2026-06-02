# Phase 2 — `live` color palette

## Scope of phase

Add a new semantic color, `live`, to the Tokyo Night theme. Warm
orange/flame in light + dark; reserved for run-state UI, live actions,
and runtime artifacts. Surface it via `@theme inline` so consumers can
write `bg-live`, `text-live`, etc.

Add a Storybook palette demo that renders the new tokens alongside the
existing palette so we can eyeball the warm/cool contrast in both
themes.

## Code Organization Reminders

- Token additions are localized to `src/routes/layout.css`.
- The palette demo is a small `*.stories.svelte` under
  `src/lib/storybook/` (or co-located with a "Theme" story file, TBD
  during implementation). Pick whichever matches the existing pattern —
  see `src/lib/components/ui/badge/Badge.stories.svelte` for tone.

## Style conventions

- HSL values, no hex (matches the existing palette).
- Light + dark tokens always declared in pairs.
- Consumer code uses semantic names (`live`), never raw hex.

## Implementation Details

### `src/routes/layout.css`

Inside the existing `:root { … }` block:

```css
--live: hsl(20 92% 48%);
--live-foreground: hsl(0 0% 100%);
--live-soft: hsl(20 90% 92%);
--live-border: hsl(20 80% 60%);
```

Inside the `.dark { … }` block:

```css
--live: hsl(22 95% 64%);
--live-foreground: hsl(20 60% 12%);
--live-soft: hsl(20 50% 18%);
--live-border: hsl(22 80% 50%);
```

Inside `@theme inline { … }`:

```css
--color-live: var(--live);
--color-live-foreground: var(--live-foreground);
--color-live-soft: var(--live-soft);
--color-live-border: var(--live-border);
```

Tailwind v4 picks these up so `bg-live`, `text-live`, `text-live-foreground`,
`bg-live-soft`, `border-live` all just work.

### Palette demo story

Add `src/lib/storybook/ThemePalette.stories.svelte` (or extend an
existing one) that renders swatches for:

- existing tokens: `primary`, `accent`, `secondary`, `destructive`,
  `warning`
- new `live` family: `live`, `live-soft`, `live-foreground`,
  `live-border`

Each swatch shows the token name, a colored block, and a preview of
text-on-fill. Use `asChild` on the `<Story>`.

```svelte
<Story name="Palette" asChild>
	<div class="space-y-6 bg-background p-6">
		<Swatch name="primary" />
		<Swatch name="accent" />
		<Swatch name="live" />
		<!-- ... -->
	</div>
</Story>
```

Where `Swatch` is a tiny inline helper (or extracted into a sibling
component). It can stay inside the story file if it's only used there.

### Documentation

Update `docs/design-system.md` with a "Live state" subsection describing
when to use the `live` family. One paragraph + a code snippet showing
`Badge variant="live"` once that variant exists (it doesn't yet — that's
phase 4).

## Validate

```
pnpm turbo check
pnpm turbo test
pnpm turbo storybook  # eyeball the palette in both light + dark
```

`check` and `test` must pass; the storybook eyeball is a manual visual
check.

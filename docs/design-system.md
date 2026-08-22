# Design system

## Palette: Tokyo Night

Inspired by the [Tokyo Night](https://github.com/enkia/tokyo-night-vscode-theme)
VS Code theme by enkia. Cool indigo/violet base with cyan + magenta
accents; dark surface is the primary aesthetic, light is a clean inverse.

The tokens live in [`src/routes/layout.css`](../src/routes/layout.css)
under `:root` (light) and `.dark`. `@theme inline` exposes them as
Tailwind utilities (`bg-background`, `text-foreground`, etc.).

### Light mode

| Token                  | Value                     |
| ---------------------- | ------------------------- |
| `--background`         | `hsl(220 23% 95%)`        |
| `--foreground`         | `hsl(234 16% 13%)`        |
| `--card`               | `hsl(220 22% 92%)`        |
| `--popover`            | `hsl(220 22% 92%)`        |
| `--primary`            | `hsl(217 87% 45%)`        |
| `--primary-foreground` | `hsl(0 0% 100%)`          |
| `--secondary`          | `hsl(220 16% 86%)`        |
| `--muted`              | `hsl(220 16% 88%)`        |
| `--muted-foreground`   | `hsl(232 10% 35%)`        |
| `--accent`             | `hsl(261 60% 55%)`        |
| `--warning`            | `hsl(35 75% 40%)`         |
| `--warning-soft`       | `hsl(35 75% 92%)`         |
| `--warning-border`     | `hsl(35 58% 62%)`         |
| `--destructive`        | `hsl(350 70% 45%)`        |
| `--live`               | `hsl(20 92% 48%)`         |
| `--live-soft`          | `hsl(20 90% 92%)`         |
| `--requirement`        | `hsl(217 87% 45%)`        |
| `--requirement-soft`   | `hsl(217 80% 92%)`        |
| `--additive`           | `hsl(188 72% 28%)`        |
| `--additive-soft`      | `hsl(188 55% 90%)`        |
| `--result-pass`        | `hsl(142 60% 33%)`        |
| `--result-pass-soft`   | `hsl(142 48% 90%)`        |
| `--result-fail`        | `var(--destructive)`      |
| `--result-fail-soft`   | `hsl(350 70% 93%)`        |
| `--result-incomplete`  | `var(--muted-foreground)` |
| `--progress`           | `var(--live)`             |
| `--border` / `--input` | `hsl(220 13% 78%)`        |
| `--ring`               | `hsl(217 87% 45%)`        |

### Dark mode (primary)

| Token                  | Value              |
| ---------------------- | ------------------ |
| `--background`         | `hsl(234 16% 13%)` |
| `--foreground`         | `hsl(230 73% 86%)` |
| `--card`               | `hsl(232 17% 17%)` |
| `--popover`            | `hsl(232 17% 17%)` |
| `--primary`            | `hsl(217 87% 73%)` |
| `--primary-foreground` | `hsl(234 16% 13%)` |
| `--secondary`          | `hsl(231 13% 23%)` |
| `--muted`              | `hsl(231 12% 20%)` |
| `--muted-foreground`   | `hsl(229 28% 70%)` |
| `--accent`             | `hsl(261 84% 78%)` |
| `--warning`            | `hsl(35 65% 64%)`  |
| `--warning-soft`       | `hsl(35 35% 20%)`  |
| `--warning-border`     | `hsl(35 48% 45%)`  |
| `--destructive`        | `hsl(350 89% 71%)` |
| `--live`               | `hsl(22 95% 64%)`  |
| `--live-soft`          | `hsl(20 50% 18%)`  |
| `--requirement`        | `hsl(217 87% 73%)` |
| `--requirement-soft`   | `hsl(217 42% 22%)` |
| `--additive`           | `hsl(188 62% 66%)` |
| `--additive-soft`      | `hsl(188 32% 18%)` |
| `--result-pass`        | `hsl(142 52% 62%)` |
| `--result-pass-soft`   | `hsl(142 28% 18%)` |
| `--result-fail-soft`   | `hsl(350 38% 22%)` |
| `--result-fail-border` | `hsl(350 48% 48%)` |
| `--border` / `--input` | `hsl(231 12% 25%)` |
| `--ring`               | `hsl(217 87% 73%)` |

### Live state — warm flame

The `live` token family marks **runtime / in-flight** UI: the live CTA
on a runner page, the QR code surface, exchange-status indicators,
delivered-credential summaries. The rest of the app stays cool — reserve
warm hues for surfaces and elements that are talking to a real service
right now.

The completion group's **add-on sections used to bend this rule**, and no
longer do: they render in the cool [`additive`](#additive--the-add-on-requirement-layer)
family as of 2026-08-21. An additive profile is a requirement layer, not a
runtime state. The reserve rule now holds without exceptions — do not
reintroduce one. (See [ADR 2026-08-21](adr/2026-08-21-additive-requirement-layer-colour.md).)

| Class                  | Where to use                                               |
| ---------------------- | ---------------------------------------------------------- |
| `bg-live`              | Filled CTA buttons that initiate live actions.             |
| `text-live-foreground` | Foreground on `bg-live`.                                   |
| `bg-live-soft`         | Right-column run-state surface (the runner panel).         |
| `border-live-border`   | Edge of `bg-live-soft` panels and live-state cards.        |
| `text-live`            | Active-state labels ("Live · in flight", step indicators). |

See the `Theme/Palette` Storybook story for an in-context preview in
both light and dark.

### Requirement — conformance blue

The `requirement` family renders RFC 2119 conformance levels
(MUST / SHOULD / MAY) in cool blue. Red stays reserved for actual run
failures, so a list of requirements never reads as a wall of errors.
All three levels use the single `requirement` Badge variant; intensity
encodes the level.

| Level    | Style                                                        |
| -------- | ------------------------------------------------------------ |
| `MUST`   | `bg-requirement text-requirement-foreground` (solid chip)    |
| `SHOULD` | `bg-requirement-soft text-requirement border` (soft)         |
| `MAY`    | `text-requirement border-requirement-border` (quiet outline) |

| Class                       | Where to use                                       |
| --------------------------- | -------------------------------------------------- |
| `bg-requirement`            | Strongest (MUST) requirement chips.                |
| `bg-requirement-soft`       | Soft requirement surfaces (SHOULD chip, callouts). |
| `text-requirement`          | Requirement label text on soft/outline chips.      |
| `border-requirement-border` | Edge of soft/outline requirement chips.            |

### Additive — the add-on requirement layer

The `additive` family (cyan-teal, h188) renders the **add-on requirement
layer**: the Add-ons sections of a completion card, and the Add-ons dimension
of the homepage filter bar. Named for the domain term (`AdditiveProfile`), not
for the UI label "Add-ons".

| Class                      | Where to use                                                    |
| -------------------------- | --------------------------------------------------------------- |
| `text-additive`            | Add-on tier labels, the filter bar's Add-ons trigger + heading. |
| `bg-additive`              | Solid add-on chips (a selected card's check pip).               |
| `text-additive-foreground` | Foreground on `bg-additive`.                                    |
| `bg-additive-soft`         | Soft add-on surfaces — selected cards, the panel header band.   |
| `border-additive-border`   | Edge of soft add-on surfaces, and the add-on tier's left rule.  |

Measured **4.93:1** light and **8.42:1** dark as text on `popover` — the bar
the warm flame failed (2.96:1 in light), and the reason the add-on layer got a
token of its own rather than continuing to borrow `live`.

### Success, run result + progress

`success` is the green "done / good" family. It marks anything completed
and successful: a **completed step** (the `complete` state and the "Run
complete" banner read prominently green) and a **passed run** (`result-pass`
aliases `success`). Green is reserved for _finished success_ — the warm
`progress`/`live` flame stays for _in-flight_ work, so a filling meter and a
finished one are never confused.

Per-run outcome tokens summarise the most recent run of a scenario on the
homepage rows:

| Token / class           | Meaning                                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| `success` (green)       | Completed + successful: a done step, a passed run. `result-pass` aliases it.                                |
| `result-pass` (green)   | A run that passed (alias of `success`).                                                                     |
| `result-fail` (red)     | A failed run. Aliases `destructive`.                                                                        |
| `result-incomplete`     | Abandoned / timed-out / never-finished run. Neutral (`muted`).                                              |
| `progress` (warm flame) | In-flight runtime. Aliases the `live` family; reserve it strictly for _progress_, not for finished results. |

#### The three outcome tones

A scenario asks the operator to judge what their wallet did, and there are
three honest answers to that — not two. Each has its own tone, and the third
one is the point:

| Outcome       | Tone          | Why                                                                                                                                      |
| ------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| pass          | `result-pass` | Finished success.                                                                                                                        |
| fail          | `result-fail` | A wrong answer, or a failed automatic check.                                                                                             |
| couldn't tell | `warning`     | It fails, and it is counted as a failure — but it is the _honest_ answer, and must be distinguishable at a glance from getting it wrong. |

**Both halves of that last row are deliberate.** `can't tell` counts against
the operator, because a wallet that leaves you unable to tell what happened
has failed you. And it is amber rather than red, because "I couldn't tell" is
a finding worth recording, not a mistake — rendering it identically to a wrong
answer made the copy and the colour argue with each other in the M5 design
review. Do not "fix" it to red for consistency, and do not soften it to a pass.

`can't tell` uses the `warning` family: `bg-warning-soft`, `border-warning-border`,
`text-warning`. `--warning-soft` and `--warning-border` exist for exactly this,
and are reused by the completion group.

#### The three requirement layers

The completion group distinguishes its tiers with a coloured dot and label in each
header row, echoed by a matching left rule on each body section:

| Tier                | Token      | Hue             |
| ------------------- | ---------- | --------------- |
| Essential           | `primary`  | blue, h217      |
| Complete / Expanded | `accent`   | violet, h261    |
| Add-ons             | `additive` | cyan-teal, h188 |

All three sit at the **cool** end, and that is the constraint, not a preference:
warm `progress`/`live` is spoken for by in-flight runtime, green `success` by
finished success, red by failures, and amber `warning` by "can't tell". A tier
label is a _chooser_, not an outcome, so the cool end is the only part of the
palette it can safely claim.

The two base tiers (M14) reused `primary` and `accent` — the Complete tier borrows
the violet the palette already defined, so Core reads as the everyday bar and
Complete as the stretch one. The **Add-ons tier is the one that needed a new
token**; it rendered in the warm `live` flame until 2026-08-21, which contradicted
that family's meaning and failed AA in light mode.
[ADR 2026-08-21](adr/2026-08-21-additive-requirement-layer-colour.md) has the
reasoning and the rejected alternatives.

The header meters use `CompletionMeter`'s dense `showPercent` readout
(`met/total · pct%`) because each tier's own label already says
"Core" / "Complete", making the word "requirements" redundant there.

Each of `success`, `result-pass`, `result-fail`, `result-incomplete`, and
`progress` has `-soft` (surface) and `-border` companions for chip styling;
`success`/`result-pass` and `progress` also expose `-foreground` for solid
fills. The `progress` aliases let runtime components (e.g.
`StepRunStateIndicator`) reference progress semantically instead of `live`.

`--radius` defaults to `0.5rem` and is exposed as `--radius-sm/md/lg/xl`
via `@theme inline`.

## Fonts

- **Inter** — body / UI (`var(--font-sans)`)
- **JetBrains Mono** — display, code, labels (`var(--font-mono)`)

Loaded from Google Fonts in `app.html` with `preconnect` + `display=swap`.

## Typography utilities

Defined in `layout.css` under `@utility`:

| Class              | Purpose                                     | Family |
| ------------------ | ------------------------------------------- | ------ |
| `text-display-lg`  | Hero headings (3rem, weight 700)            | mono   |
| `text-headline-md` | Section headings (1.75rem, weight 600)      | mono   |
| `text-title-lg`    | Card/component titles (1.25rem, weight 600) | sans   |
| `text-body-md`     | Default body copy (0.875rem)                | sans   |
| `text-label-md`    | Uppercase labels (0.75rem, tracking 0.05em) | mono   |

## Theme toggle

`src/lib/components/theme-toggle/ThemeToggle.svelte` toggles between
`light` and `dark`. The icon shows the current theme (sun = light, moon =
dark); hover or keyboard focus reveals a full-button preview of the
opposite theme's hovered outline style (icon + colors) via CSS. New
visitors (or legacy `localStorage.theme = system`) follow the OS
preference until the first click, which pins an explicit choice. The
preference persists in `localStorage.theme` and is applied by toggling
the `.dark` class on `<html>`. An inline script in `app.html` mirrors
the same logic before paint to prevent flash.

The `Components/ThemeToggle` Storybook story demonstrates the control
in isolation and inside a card.

## UI primitives

Generated by [shadcn-svelte](https://shadcn-svelte.com) into
`src/lib/components/ui/`. Each has a Storybook story under `UI/<Name>`.

| Primitive | Source       | Notes                                                                                                                     |
| --------- | ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Button    | `ui/button/` | Variants: default / secondary / destructive / outline / ghost / link. Sizes: xs / sm / default / lg / icon (+icon-sm/lg). |
| Card      | `ui/card/`   | Subcomponents: Header, Title, Description, Content, Footer, Action.                                                       |
| Badge     | `ui/badge/`  | Variants: default / secondary / destructive / outline.                                                                    |
| Input     | `ui/input/`  | Form-styled `<input>`.                                                                                                    |
| Tabs      | `ui/tabs/`   | List / Trigger / Content. Backed by bits-ui.                                                                              |
| Dialog    | `ui/dialog/` | Trigger / Content / Header / Title / Description / Footer / Close. Backed by bits-ui.                                     |

## Adding a new primitive

```sh
pnpm dlx shadcn-svelte add <name>
```

Then:

1. Inspect the generated component for token mismatches (we use the
   default shadcn token names, so most components work as-is).
2. Add a `<Name>.stories.svelte` next to it that exercises every variant.
3. Re-run `pnpm turbo check test` to validate types + the new story.

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
| `--destructive`        | `hsl(350 70% 45%)`        |
| `--live`               | `hsl(20 92% 48%)`         |
| `--live-soft`          | `hsl(20 90% 92%)`         |
| `--requirement`        | `hsl(217 87% 45%)`        |
| `--requirement-soft`   | `hsl(217 80% 92%)`        |
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
| `--destructive`        | `hsl(350 89% 71%)` |
| `--live`               | `hsl(22 95% 64%)`  |
| `--live-soft`          | `hsl(20 50% 18%)`  |
| `--requirement`        | `hsl(217 87% 73%)` |
| `--requirement-soft`   | `hsl(217 42% 22%)` |
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
failures, so a checklist of requirements never reads as a wall of errors.
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

### Success, run result + progress

`success` is the green "done / good" family. It marks anything completed
and successful: a **completed checklist step** (the `StepRunStateIndicator`
`complete` state and the "Run complete" banner read prominently green) and a
**passed run** (`result-pass` aliases `success`). Green is reserved for
_finished success_ — the warm `progress`/`live` flame stays for _in-flight_
work, so a filling checklist and a finished one are never confused.

Per-run outcome tokens summarise the most recent run of a checklist
combination on the homepage rows and in `RunResultBadge`:

| Token / class           | Meaning                                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| `success` (green)       | Completed + successful: a done step, a passed run. `result-pass` aliases it.                                |
| `result-pass` (green)   | A run that passed (alias of `success`).                                                                     |
| `result-fail` (red)     | A failed run. Aliases `destructive`.                                                                        |
| `result-incomplete`     | Abandoned / timed-out / never-finished run. Neutral (`muted`).                                              |
| `progress` (warm flame) | In-flight runtime. Aliases the `live` family; reserve it strictly for _progress_, not for finished results. |

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

`src/lib/components/theme-toggle/ThemeToggle.svelte` cycles
`light → dark → system → light`. The choice persists in
`localStorage.theme` and is applied by toggling the `.dark` class on
`<html>`. An inline script in `app.html` mirrors the same logic before
paint to prevent flash.

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

# The add-on requirement layer gets its own token, `--additive`

- Status: accepted
- Date: 2026-08-21
- Context: the mega-menu polish pass on the homepage filter bar, which
  needed a colour language for its three dimensions. The Add-ons
  dimension already had a colour on the page below it — the warm `live`
  flame on a completion card's add-on sections — and adopting it in the
  bar would have spread a bend in the design system rather than
  containing it.

## Context

Scenarios group into three **requirement layers**, and a completion card
renders all three:

| Tier                | Meaning                                                  |
| ------------------- | -------------------------------------------------------- |
| Essential           | The scenarios every conforming implementation must pass. |
| Complete / Expanded | Optional scenarios that take the same profile further.   |
| Add-ons             | Requirements a selected additive profile layers on top.  |

Two of them had tokens. Essential used `primary` (blue) and Expanded used
`accent` (violet) — both chosen in M14 with the explicit note that no new
token was needed. The third borrowed `--live`.

That borrowing was wrong in two independent ways.

**Semantically.** `docs/design-system.md` reserves the warm `live` family
for _"surfaces and elements that are talking to a real service right
now"_ — the runner CTA, the QR surface, exchange-status indicators. An
`AdditiveProfile` is a **requirement layer**. It is authored, static, and
selected before anything runs. The add-on sections were the reserve
rule's one standing exception, and the rule is load-bearing: a reader who
has learned that warm means _in flight_ is actively misled by a warm
section heading that means _extra requirements_.

**Mechanically.** `text-live` on a light `popover` measures **2.96:1**,
below WCAG AA's 4.5:1 for text. Light-mode `--live` is a 3:1 hue; it can
carry borders and rails but not small text and not a solid chip. The
filter-bar treatment needs the tone as 12px uppercase mono labels in both
themes, which `live` cannot do.

Extending `live` into the bar would have taken a defect that today lives
on three card sections and put it on the homepage's primary control.

## Decision

**A dedicated `additive` token family, cyan-teal h188, following the
`requirement`/`success` shape: base + `-foreground` + `-soft` +
`-border`, in `:root` and `.dark`, registered with four `@theme inline`
`--color-additive-*` entries.**

```css
:root {
	--additive: hsl(188 72% 28%);
	--additive-foreground: hsl(0 0% 100%);
	--additive-soft: hsl(188 55% 90%);
	--additive-border: hsl(188 45% 55%);
}
.dark {
	--additive: hsl(188 62% 66%);
	--additive-foreground: hsl(234 16% 13%);
	--additive-soft: hsl(188 32% 18%);
	--additive-border: hsl(188 42% 40%);
}
```

**Named for the domain term, not the UI label.** The codebase already
says `AdditiveProfile`, `additiveProfilesForRoles`,
`rolesOfAdditiveProfile`, and `CompletionGroup`'s own tone union is
already `'essential' | 'complete' | 'additive'` — the third member simply
resolved to `live`. The user-facing label is "Add-ons"; the token is not
named for it, the same way `requirement` is not named "MUST".

**The colour marks the layer, not the surface.** In the filter bar, Roles
and Profiles select base-profile requirements and speak `requirement`
blue; Add-ons layers a different kind of requirement and speaks
`additive`. That is why the bar and the cards can agree at all — they are
both keyed to the same thing.

### Why h188

Three candidates were built and compared live in Storybook, each
pre-filtered to clear AA as text on `popover` in **both** themes:

| Hue                     | Light              | Dark               | Verdict                                                                                              |
| ----------------------- | ------------------ | ------------------ | ---------------------------------------------------------------------------------------------------- |
| A — spring green, h158  | `#137652` 4.59     | `#76dbb6` 8.96     | Rejected. The dark value sits beside `success`'s `#6cd091`; a filled chip risks reading as _passed_. |
| B — teal-green, h172    | `#137265` 4.77     | `#74dcce` 9.23     | Runner-up. Lands on Tokyo Night's own teal.                                                          |
| **C — cyan-teal, h188** | `#146d7b` **4.93** | `#73d0de` **8.42** | **Chosen.** Furthest from `success`, highest light-mode contrast.                                    |

C's known cost is that it is the closest of the three to `primary` blue.
Checked in the browser against a stand-in completion card in both themes:
the three layers read as three.

## Alternatives considered

- **Keep `live`.** Rejected on both counts above — the semantic
  contradiction and the 2.96:1 light-mode contrast.
- **Fix `--live`'s light value and keep borrowing it.** Rejected: it
  darkens the flame across every runner page, and it would still leave
  _runtime_ and _requirement layer_ sharing one colour. That fix is still
  worth doing on its own terms; this change removes one of its consumers.
- **Reuse `success` green.** Rejected: green means finished success. An
  add-on section is not a passed one.
- **Reuse `accent` violet.** Rejected: `accent` already means the
  Expanded tier, so two of the three layers would be one colour.
- **No colour for add-ons; leave the tier neutral.** Rejected: the tier
  already had a colour on the cards, and dropping it would have made the
  card _lose_ information to make the bar consistent.

## Consequences

- The warm-flame reserve rule now holds **without exceptions**. This is
  the point of writing it down: the exception existed for months and read
  as precedent.
- **Layer → hue is now a documented mapping** (Essential blue h217 →
  Expanded violet h261 → Add-ons teal h188). A fourth tier, if one
  appears, joins the cool end and states its contrast in both themes
  before shipping.
- `CompletionGroup` and the homepage filter bar are the initial adopters.
  The other add-on surfaces — `AdditiveChecklistSection`,
  `AdditiveProfileCard`, `RequirementReport` — are neutral or `primary`
  today and were deliberately left alone; they carry no conflict, and
  adopting the token there is a coherence improvement to make on its own.
- `--live`'s light-mode contrast defect is **not fixed here**. It remains
  on `MobileWalletDrawer` and `StepRunStateIndicator`, which is a smaller
  surface than before.

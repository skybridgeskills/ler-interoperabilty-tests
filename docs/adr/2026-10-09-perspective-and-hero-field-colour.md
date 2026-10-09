# The reader's Perspective gets orchid, and the hero gets a decorative field

- Status: accepted
- Date: 2026-10-09
- Context: the UX round that adds a shared page hero and a Builder / Evaluator
  Perspective. The hero needed more colour than the current palette's neutral
  surfaces, and every hue already on the page carries one meaning.

## Context

The page hero is meant to be the most colourful thing on a page. The palette
it has to sit beside is already full of meaning:

| Family                         | Meaning                                  |
| ------------------------------ | ---------------------------------------- |
| `primary` / `requirement` blue | Essential tier, conformance, links, CTAs |
| `accent` violet                | the Expanded tier                        |
| `additive` teal                | the add-on requirement layer             |
| `live` warm flame              | talking to a real service right now      |
| `success` green                | a completed, passed outcome              |

Borrowing any of these for decoration would teach the reader the wrong thing
about the surfaces that carry them. The same release adds a **Perspective** —
whether the reader is building a product or evaluating one — and that choice
needs a marker colour too. A Perspective is a property of the reader, not of
the content, so one hue can serve both: it marks "you", and it colours the
hero that greets you.

## Decision

**An orchid `perspective` family (h305) in the `additive` shape, and a separate
decorative `--hero-field` that is the only home of sky (h196).**

```css
:root {
	--perspective: hsl(305 55% 38%);
	--perspective-foreground: hsl(0 0% 100%);
	--perspective-soft: hsl(305 60% 93%);
	--perspective-border: hsl(305 40% 70%);
	--hero-field:
		radial-gradient(circle at 12% 38%, hsl(305 75% 90% / 0.95), transparent 45%),
		radial-gradient(circle at 88% 28%, hsl(196 100% 87% / 0.95), transparent 48%),
		linear-gradient(135deg, hsl(300 40% 97%), hsl(200 60% 97%));
}
.dark {
	--perspective: hsl(305 62% 76%);
	--perspective-foreground: hsl(234 16% 13%);
	--perspective-soft: hsl(305 30% 21%);
	--perspective-border: hsl(305 35% 45%);
	--hero-field:
		radial-gradient(circle at 12% 38%, hsl(305 45% 26% / 0.9), transparent 45%),
		radial-gradient(circle at 88% 28%, hsl(196 55% 24% / 0.9), transparent 48%),
		linear-gradient(135deg, var(--background), var(--background));
}
```

The four `perspective` tokens get `@theme inline` `--color-perspective-*`
entries. `--hero-field` is not a colour; it is exposed as the `bg-hero-field`
utility, which goes plain (`background: none`) in print.

**Named for the domain term**, as `additive` was: `Perspective` is the type in
`src/lib/interop/perspective/`.

**Permitted uses only:**

- the Perspective controls and markers (the Home switch, the detail-hero chip,
  the first-visit gate, the framing block, the filter panels' note tag);
- the hero's bloom (through `--hero-field`);
- the hero's own action, its About button.

**Never** on content — scenario, requirement, role or profile surfaces — nor on
general links or CTAs, which stay `primary` blue or neutral.

**The sky exemption is narrow and by name.** Sky may appear only inside
`--hero-field`. It is never text, a chip, a border or a control.

**No variation.** Builder and Evaluator share the hue and are told apart by
icon and label, as Role and Standard Profile are. There is no per-page tint;
detail heroes carry context chips instead.

### Why orchid + sky

Seven candidates were compared live in both themes, each as a mini hero beside
today's meaning chips and the live runner panel
(`swatches-v1.html` in the planning folder):

| Candidate                      | Verdict                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| A — sky + cream, ink chip      | Rejected. Cream goes a muddy brown in dark, beside the `can't tell` state; the Perspective gets no hue of its own. |
| B — orchid only                | Runner-up. Correct meaning, but a one-hue field reads flat.                                                        |
| C — lime h90                   | Rejected. Olive in light, and reads as _pass_.                                                                     |
| D — brand flame                | Rejected. The Perspective chip and the live runner panel look like siblings; breaks the warm-flame reserve.        |
| **E — orchid h305 + sky h196** | **Chosen.** Orchid is clear of every meaning-bearing hue; the sky bloom adds air to the field without leaving it.  |
| F — orchid + cream             | Rejected. Cream browns in dark, as in A.                                                                           |
| G — rose h335                  | Rejected. The chip reads as _fail_.                                                                                |

Measured contrast for the chosen values:

| Pairing                                           | Light    | Dark     |
| ------------------------------------------------- | -------- | -------- |
| `text-perspective` on `popover`                   | **5.68** | **7.33** |
| `text-perspective` on `background`                | 6.12     | 8.19     |
| chip: `text-perspective` on `bg-perspective-soft` | 5.67     | 6.38     |
| button: `perspective-foreground` on `perspective` | 6.90     | 8.19     |

All clear WCAG AA (4.5:1) for small text in both themes.

## Alternatives considered

- **A generic `--brand` token.** Rejected. A token with no meaning to protect
  spreads: it would be on links, cards and CTAs within a release, and the hero
  would stop being the colourful thing.
- **A general "washes don't count" rule** (any pale field may use any hue).
  Rejected. Pale soft surfaces already carry meaning in this system —
  `live-soft`, `warning-soft`, the tier softs — so a reader cannot tell a
  decorative wash from a meaningful one by lightness alone. The exemption is
  stated for one token instead.
- **Robert's mockup sky + cream.** Rejected as candidate A above.
- **Tint the hero per page** (for example by a scenario's tier). Rejected: it
  makes the hero carry meaning, and the meaning-bearing families are exactly
  what it must not borrow.

## Consequences

- Orchid now has one meaning — the reader — and a short list of permitted
  surfaces. A new use outside that list is a design change, not a styling
  choice.
- Sky has exactly one home. A sky-coloured chip or border anywhere is a bug.
- The hero is the only decorative colour on a page; the rest of the palette
  keeps one meaning per hue.
- `design-system.md` documents both families and the exemption.

# Add-on badges are keyed per base profile, and gated on core

- **Status:** Accepted
- **Date:** 2026-08-24
- **Milestone:** M15 (P1, P3, P7)
- **Supersedes part of:** [`2026-08-18-badge-award-model.md`](2026-08-18-badge-award-model.md)
  § Amendment 2026-08-21 (tier keying)
- **Amends the successor named by:**
  [`2026-08-21-additive-requirements-as-memberships.md`](2026-08-21-additive-requirements-as-memberships.md)

## Context

An add-on badge was keyed `(additive, role)` and spanned **every base profile at
once**. `badgeKey` mapped the `additive` tier to the additive profile alone, so a
single _Data Integrity Cryptosuites Wallet_ badge covered VCALM work and OID4
work together, and `scenariosBehindBadge` returned the additive's whole set
regardless of which protocol produced it.

Three things were wrong with that, and only the third was recorded at the time.

1. **The badge did not name its protocol.** A wallet that had done all of the
   DIC work over VCALM and never touched OID4 would hold a credential that
   declined to say so — and one that says _"Data Integrity Cryptosuites Wallet"_
   reads, to anyone who was not there, as the whole axis.
2. **It was claimable without the core it extends.** Nothing gated an add-on on
   the base profile-role's own badge, so an implementer could hold _DIC Wallet_
   while failing ordinary OID4 wallet acceptance.
3. **It could not be rendered honestly.**
   [`2026-08-21-additive-requirements-as-memberships`](2026-08-21-additive-requirements-as-memberships.md)
   records this as its strongest open problem: a cross-protocol group cannot be
   shown from inside one base profile's card, because the card only knows its own
   protocol's share. `evaluateAdditiveSlice` existed as a _display-only view_ and
   was explicitly documented as **"not a badge key"** to keep the two apart.

Seven cross-protocol `{oneOf}` groups existed to serve exactly that spanning
badge — _"any one of: the EdDSA issuer scenario over direct delivery, VCALM, or
OID4"_. Inside one base profile's slice such a group has exactly **one** member:
arithmetically correct, expressing nothing, and precisely the "any one of,
containing one row" the prior ADR complains about.

The owner's correction is what forced the question:

> There is not a badge you can earn for just the completion of one scenario,
> badges are for logical groups of things within a profile-role. […] And an
> addon badge for that role with all DataIntegrity Cryptosuites in the DIC group
> for VCALM wallet. **Addons also require core.**

## Decision

**Key an add-on badge `(additive, base profile, role)`.** The `add-on` arm of
`BadgeDefinition` carries **both** profiles — `additiveProfile` and
`baseProfile` — and `scenariosBehindBadge` narrows to scenarios whose base
membership is that profile, making its set identical to
`evaluateAdditiveSlice`'s.

**The slice is now the badge key.** The view and the key are one thing; the
comment saying otherwise is deleted rather than qualified.

**Gate an add-on on core.** `isAddOnClaimable(addOn, core)` requires both meters
full; `addOnClaimBlocker` distinguishes `'unfinished'` (the add-on's own work)
from `'core'` (the Essential badge underneath), because those are different
things for a reader to fix.

**Drop the seven `oneOf` groups**; every member becomes a plain `required`
membership in its additive. The `{oneOf}` primitive **stays in `Membership` and
catalog rule 5 still guards it** — it is dormant, not removed.

**Rename the tiers** `base`/`complete`/`additive` → `essential`/`expanded`/`add-on`,
matching the vocabulary the pages already used. Free: no badge had been issued
(owner, 2026-08-22 — _"we haven't shipped any badges yet"_).

## Consequences

- **_DIC VCALM Wallet_ and _DIC OID4 Wallet_ are different badges**, with
  disjoint scenario sets, and each names its protocol in its own copy. Harder to
  earn than the spanning badge, and honest about what it covers.
- **An add-on card renders from inside a base profile's slice truthfully**, which
  is the prior ADR's open problem resolved — by removing the cross-protocol
  groups, not by building a renderer for them.
- **The registry went from 2 badges to 20** (8 Essential, 1 Expanded, 11 add-on),
  because per-protocol keying is what made the missing ones expressible. Every
  renderable group now has a badge; a test walks them and fails on any that does
  not.
- **Expanded is registered only where its optional set is non-empty** — today
  `oid4:wallet` alone. A badge over an empty tier would be claimable the instant
  its Essential was, which is a badge that means nothing.
- **`{oneOf}` is dormant.** A reader finding the primitive with no user should
  find this ADR, not conclude it was abandoned by accident.
- **Restructuring cost nobody a stored result**, and this was verified rather
  than assumed: memberships sit outside `scenarioFingerprint` (asserted per
  scenario in `catalog-validation.test.ts` by re-keying every scenario's
  memberships and comparing fingerprints), and no additive badge had ever been
  registered, so no claim snapshot could break.

## Alternatives considered

**A multi-protocol run interface** — one scenario, a run-time protocol picker,
possibly a membership naming no base profile. This is the successor
[`2026-08-21-additive-requirements-as-memberships`](2026-08-21-additive-requirements-as-memberships.md)
predicted, and it is **declined, not deferred**. Per-protocol badges satisfy the
owner's original M11 framing — _"wallet A over VCALM and wallet B over OID4 get
the same item completed"_ — with different-but-equivalent badges, and they do it
without a run interface, without touching `Membership`, and without changing
catalog rule 4. The owner reached the same conclusion from the UX side:

> I wonder if the multi-protocol scenario is actually the right solution. When we
> wrote that idea, we hadn't done UX design on how the additive profiles fit in
> […] we have an add-ons menu that is slick now. I think we can lean into the
> add-ons pattern after all.

A later reader must not go looking for this successor. It did not happen, and
that is the decision.

**Base-less memberships.** `Membership` and catalog rule 4 are unchanged. The
multi-protocol scenario was the only thing that wanted a scenario naming zero
base profiles, and it is gone.

**A higher-order badge** spanning every profile-role relevant to an additive.
Declined by the owner: _"I don't think we need a DIC higher order badge."_

**Keeping the spanning badge and rendering a partial meter on each card.** This
is the honest-rendering problem restated, not solved: the card would still show a
fraction of a total it cannot explain from its own rows.

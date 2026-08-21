# Additive requirements as memberships, and what `oneOf` is for

- Status: accepted
- Date: 2026-08-21
- Context: M11 — the issuer page migration, and the first milestone in which
  additive requirements are actually **scored** under the scenario model. The
  replacement for the checklist-matching model that
  [2026-06-10](./2026-06-10-additive-checklist-matching-model.md) described and
  [2026-08-13](./2026-08-13-scenario-as-runnable-unit.md) superseded in principle.

## Context

Under the checklist model an additive profile was a bundle of requirement rows
merged in at read time: `additiveChecklistsForCombination` matched
`appliesToBaseProfiles` against a `(role, workflow)` pair and appended the
matching rows to the base checklist. The scenario model replaced that with
`Membership` — a scenario names the profiles that claim it — but until M11 no
scenario named an additive, so the machinery was decorative and the questions it
raises were unanswered.

M11 had to answer them, because deleting the three issuer routes without
`open-skill-alignment` would have been a genuine regression: OSA is the only
additive with nine real, working checks.

Three questions had to be settled at once:

1. What **is** an additive's item — a scenario, a protocol, a cryptosuite, a
   payload shape?
2. What is **`oneOf`** for?
3. What level does an additive scenario take in its **base** profile?

## Decision

**An additive profile keeps its identity and names whole scenarios.** It does not
contribute loose rows to somebody else's checklist. A profile — base or additive —
is the derived set of memberships that name it.

**Its items are per-cryptosuite (DIC) or per-payload-shape (OSA), not
per-protocol.** `data-integrity-cryptosuites` asks the issuer two questions —
_can you sign EdDSA?_ and _can you sign ECDSA?_ — and `open-skill-alignment` asks
one: _can you carry a performance scale and a learner result?_ None of those is a
question about VCALM or OID4VCI.

**`oneOf` expresses protocol breadth inside an additive.** It is _not_ the
producer-floor primitive. The floor — "signed with a cryptosuite we can verify" —
is already a `required` row on each base scenario, so it needs no group. The group
instead says: the same item completes however the credential arrived. In the
owner's words:

> it would be nice for wallet A that can receive EdDSA over VCALM and wallet B
> that can receive EdDSA over OID4VP to get the same item completed within this
> data integrity cryptosuites category, EdDSA item(s).

So M11 ships nine additive scenarios forming three groups —
`dic-issuer-eddsa`, `dic-issuer-ecdsa`, `osa-issuer-payload` — each with one
member per transport and **identical requirement ids** across members (catalog
rule 5). DIC's issuer card reads **two obligations, not six**; OSA's reads one,
not three. As few as two runs fill DIC's meter.

Two facts make this expressible with **no schema change**. A `oneOf` group may
span base protocols — rule 5 compares only requirement ids, and
`evaluateCompletion` resolves groups per profile. And **memberships sit outside
the scenario fingerprint**, which covers steps, actions and requirement
`id`/`level`/`statement`/`check` — so restructuring an additive later costs
nobody their stored results.

**An additive scenario takes `additive-only` in its base profile.** The base
names it because that protocol is what the scenario runs over, and claims **none**
of it. This decision was made against `optional` during implementation and the
reasoning matters: `optional` is the base profile's **Expanded** tier, and
Complete is cumulative (Essential ∪ Expanded), so `optional` would put add-on work
into a base profile's Complete badge — making "a complete OID4 issuer" quietly
mean "…and supports both cryptosuites, and does skill alignment". Nobody opted
into that. The invariant, stated positively: **an additive gives a base profile a
companion badge, never a harder denominator.**

**`CheckCtx.includeAdditive` is deleted.** Under memberships a scenario either
names the additive or it does not; the flag predated per-additive selection and
decided nothing.

## Consequences

- **Restructuring an additive later is free**, in stored results. This is what
  makes it safe to defer the harder additive questions to a sibling effort (M15)
  rather than answering them for one role inside a single-role migration.
- **A cross-protocol group cannot be rendered honestly from inside one base
  profile's card.** `evaluateAdditiveSlice` scopes an additive's work to one base
  profile — correct for a card that shows one profile — so a homepage card shows
  an "any one of" box containing only its own member, and passing the VCALM
  member leaves the OID4 card's slice reading unmet. The **additive's own page**,
  where the badge is claimed, is correct: one obligation, met. Nothing is
  mis-awarded, but the cards cannot express the obligation, and this is the
  strongest argument for M15's multi-protocol run interface.
- **A group's members no longer share a workflow.** `obligationsByWorkflow`
  renders a mixed group under its first member's workflow heading; the comment
  claiming members share one "by construction" was corrected rather than the
  behaviour changed, because front-page grouping is the UX effort's territory.
- **The DIC consumer axis is unmeasured, and so are
  `producer.key-type-matches` and `producer.proof-purpose`.** Said explicitly so
  the absence does not read as coverage. See
  [2026-06-10 crypto-axis ownership](./2026-06-10-crypto-axis-ownership.md).
- **A group's members must not drift apart.** Rule 5 enforces identical
  requirement ids at load, and M11 additionally declares OSA's nine requirements
  once in a shared module so a later edit cannot silently split them.

## Alternatives considered

**One scenario per base with an either-suite check.** Rejected: it leaves `oneOf`
a dead primitive, and it hides which suite was actually proven — the meter would
say "cryptosuites: met" for an issuer that only ever signed EdDSA. Retrofitting
the split later would change requirement ids and drop stored results.

**Several `required` memberships, one per suite per protocol.** Rejected: it
forces every operator to run every protocol to fill an additive that is not about
protocols.

**A single multi-protocol scenario with a run-time protocol picker.** The likely
successor, and deferred rather than rejected. It needs a run interface the suite
does not have, and possibly dropping the base membership entirely so an additive
can bootstrap its own test data — a change to `Membership` and catalog rule 1.
That question spans issuer, wallet and verifier, so answering it inside a
single-role migration would answer it for one role and retrofit two. It is the
M15 sibling effort, scheduled after M12.

**Keeping `optional` for the base membership**, as the M11 plan originally
specified. Rejected once the two-tier model landed: see the decision above. The
plan predated it, and its own stated invariant is the reason to change.

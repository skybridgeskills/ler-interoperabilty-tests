# Additive-checklist matching model (multi-base by role + workflow)

- Status: accepted
- Date: 2026-06-10
- Context: OID4 profile rename + additive-profile application

## Context

Additive profiles (`data-integrity-cryptosuites`, `open-skill-alignment`)
layer extra requirements on top of one or more base profiles. Each additive
declares `appliesToBaseProfiles: ProfileSlug[]` and contributes per-(role ×
workflow) checklists reusing the standard `WorkflowChecklist` shape — which
also carries a `profile: ProfileSlug` field.

With this change, `data-integrity-cryptosuites` applies to **three** base
profiles — `vcalm`, `oid4`, and `ob3-direct-delivery`. The 4 exchange
checklists (issuer×credential-issuance, wallet×credential-acceptance,
wallet×credential-presentation, verifier×credential-request-and-verification)
are identical for vcalm and oid4. We needed a single rule for "which additive
checklists apply to a given base combination" that the combined-view UI (P3)
and the issuer runner (P4) both consume, without duplicating checklists
per base.

## Decision

An additive checklist for `(role, workflow)` applies to base profile `P` **iff**
`additive.appliesToBaseProfiles` includes `P` **and** `P` has a base checklist
for that `(role, workflow)`. Matching is by **(role, workflow)** only; the
additive checklist's own `profile` field is **ignored** for matching.

This is implemented once, in
`src/lib/interop/accessors.ts` →
`additiveChecklistsForCombination(base, role, workflow)`, which is the single
source of truth used by:

- the base checklist pages' combined view (`loadChecklist` → `WorkflowChecklist`),
- the OB3 Direct Delivery issuer runner's `buildChecklistInputs`.

The `profile` field on additive checklists is kept schema-valid (set to a
representative base for documentation) but is a don't-care for application.

Consequences of the rule:

- The 4 DI exchange checklists automatically apply to both `vcalm` and `oid4`
  with **no duplication**.
- The new producer-only DI `issuer × direct-credential-issuance` checklist
  applies only to `ob3-direct-delivery` (the only base exposing that workflow).

## Alternatives considered

- **Match by the additive checklist's `profile` field.** Rejected: it would
  force one additive-checklist copy per base profile (duplicating the 4
  identical exchange checklists across vcalm and oid4), and the field was
  already ignored by every existing consumer.
- **Duplicate additive checklists per base profile.** Rejected: content
  duplication that drifts; the requirements are identical across vcalm/oid4.
- **A bespoke mapping table (additive × base × workflow → checklist).**
  Rejected: more machinery than the derivable rule; `appliesToBaseProfiles`
  plus base-checklist existence already encodes the intent.

## Consequences

- Adding a base profile that shares an existing (role, workflow) automatically
  picks up applicable additives once it is added to `appliesToBaseProfiles` —
  no new checklist files.
- The `profile` field on additive checklists is intentionally non-authoritative;
  contributors must not rely on it for behavior (documented in the accessor
  TSDoc and the additive checklist files).
- Any future consumer of "additive application" must go through
  `additiveChecklistsForCombination` rather than re-deriving the rule, to keep
  the UI and the runner consistent.

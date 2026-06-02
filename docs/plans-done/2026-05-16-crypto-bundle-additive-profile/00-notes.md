# 00-notes — Crypto-bundle additive profile

## Scope of work

Introduce a second additive profile, `data-integrity-cryptosuites`, that
bundles the issuer-identity DID method, key type, and proof cryptosuite
choices used in the existing `vcalm-eddsa` base profile and adds
ECDSA-side support (`ecdsa-rdfc-2019` + P-256 keys) as a second
"complete set" inside the same bundle.

The bundle declares **two complete cryptosuite options** that issuers
(producers of credential proofs) MAY pick from — they MUST support at
least one — while wallets and verifiers (consumers) MUST support all
options in the bundle. Producer/consumer asymmetry is artifact-scoped:
the issuer role itself is a consumer of holder VP proofs during DID
auth, so its `credential-issuance` checklist gets both producer
(VC-signing) and consumer (VP-verifying) requirements.

The two options in v1:

| Option | Cryptosuite       | Key type | Curve   | DID methods (issuer + holder) |
| ------ | ----------------- | -------- | ------- | ----------------------------- |
| EdDSA  | `eddsa-rdfc-2022` | Ed25519  | Ed25519 | did:web, did:key              |
| ECDSA  | `ecdsa-rdfc-2019` | P-256    | P-256   | did:web, did:key              |

Apply the bundle to the existing `vcalm-eddsa` profile — but since that
profile name already hard-codes one of the two cryptosuites, we'll
**rename the base profile `vcalm-eddsa` → `vcalm`** and neutralize its
checklists so that the cryptosuite/DID-method specifics live in the
additive profile. (The user explicitly framed this as "refactoring the
profiles a little bit from when we described them in that report.")

## Current state of the codebase as it pertains to this scope

- The additive-profile mechanism shipped in
  `docs/plans-done/2026-05-15-open-skill-alignment-additive-profile/`.
  - `AdditiveProfile` ZodFactory (`src/lib/interop/additive-profile-schema.ts`)
    has slug enum `z.enum(['open-skill-alignment'])` and a generic
    `checklists: WorkflowChecklist[]` slot — adding a new slug literal is
    the only schema change needed.
  - `allAdditiveProfiles` is in `additive-profiles/all-additive-profiles.ts`.
  - `accessors.additiveProfilesForBaseProfile(slug)` already discovers
    additives that apply to a given base.
  - `/profiles` and `/profiles/[slug]` pages are already generic —
    they iterate `allAdditiveProfiles` and switch on `data.kind`. No
    new components required.
- The `vcalm-eddsa` profile lives in `src/lib/interop/profiles/vcalm-eddsa/`
  with 4 checklists (issuer × credential-issuance, wallet ×
  credential-acceptance, wallet × credential-presentation, verifier ×
  credential-request-and-verification). Every checklist explicitly
  references `eddsa-rdfc-2022` + Ed25519 + `did:web`/`did:key` today.
- The slug `vcalm-eddsa` is referenced in **21 places across 17
  files** in `src/` (from `grep -rn`):
  - `profile-schema.ts` enum + `profile-schema.test.ts` (3 cases)
  - `accessors.test.ts` (6 cases)
  - `profiles/all-profiles.ts` (import path)
  - `profiles/vcalm-eddsa/*` (5 files — all internal references)
  - `components/interop/runnable-checklist/RunnableChecklist.stories.svelte`
  - `components/interop/workflow-checklist/WorkflowChecklist.stories.svelte`
  - `components/interop/profile-summary/ProfileSummary.stories.svelte`
  - `pages/runnable-wallet-acceptance/RunnableWalletAcceptancePage.svelte`
  - `routes/wallet/[workflow]/[profile]/+page.ts` (shadow logic)
  - Folder rename: `src/routes/wallet/credential-acceptance/vcalm-eddsa/`
    → `…/vcalm/` (the runnable wallet-acceptance route)
  - Folder rename: `src/lib/interop/profiles/vcalm-eddsa/` →
    `…/vcalm/`
  - Misc fixture text in `ob3-credential-template.ts` calls the
    test achievement "Demonstrated VCALM-EdDSA wallet acceptance" —
    leave it (it's a sample credential name, not a slug).
- No code currently references the ECDSA cryptosuite at runtime (the
  `oid4-ecdsa` profile is documented in `strada-ecosystem-coordination-guide/profiles/oid4-ecdsa.md`
  but the local profile is content-only too).
- There's no runnable issuer page for the vcalm flow today — vcalm has
  a runnable **wallet-acceptance** page that drives a full exchange
  through a transaction service. The new additive will be **content-only**
  in v1 (checklists with stable requirement ids, ready for a runner
  later); no check-runner integration ships in this plan.

## Style conventions (for this plan)

- `ZodFactory` for any new shape (slug enums, schemas) — no separate
  `interface` + `parse()` patterns.
- Factory functions, never classes — applies if we add a typed
  cryptosuite-option helper. We don't expect to.
- Domain-first folder layout: each additive profile lives under
  `src/lib/interop/additive-profiles/<slug>/`, mirroring the
  open-skill-alignment layout.
- One concept per file; new checklist files stay under ~200 lines.
- Stable `id` on every new `ChecklistRequirement` (kebab-case,
  namespaced — `data-integrity-cryptosuites.<topic>.<assertion>`).
  Even though we ship no runner this round, the runner pattern
  expects ids and we want forward compatibility.
- Document the "two options inside one bundle" semantics in the
  additive profile's description + via the requirement text. Don't
  extend `AdditiveProfile` with a new structured field for options
  this round — keep the schema surface stable.

## Questions and resolutions

The user explicitly said to not stop for clarifying questions and to
make the reasonable call. The decisions below are recorded so future
phases can audit them.

### Q1 — Slug for the new additive profile?

**Decision:** `data-integrity-cryptosuites`. Formal name from the VC
Data Integrity spec, scoped enough that a future "transport
cryptography" or "key-exchange" additive could coexist without
collision.

### Q2 — Rename `vcalm-eddsa` to `vcalm`, or leave the name and have the additive contradict the base?

**Decision:** Rename to `vcalm`. The user's framing — "we are
refactoring the profiles a little bit" + "make the vcalm profile
include this crypto bundle profile" — implies the base profile is the
neutral container and the additive owns the cryptosuite choices. A
contradiction-style additive ("base says eddsa-rdfc-2022 only, additive
says either eddsa- or ecdsa-") would be confusing for readers.

### Q3 — How wide is the rename?

**Decision:** All 21 src references + 2 folder renames (one in
`src/lib/interop/profiles/` and one in `src/routes/wallet/credential-acceptance/`).
The plans-done docs use the old slug — leave those alone (they're
historical) and don't grep-fix them.

### Q4 — Which workflows does the new additive cover?

**Decision:** All 4 vcalm workflows (issuer × credential-issuance,
wallet × credential-acceptance, wallet × credential-presentation,
verifier × credential-request-and-verification). The user said "with
each of its role-specific workflows".

### Q5 — Producer / consumer asymmetry — how to express?

**Decision:** Inline in requirement text per workflow. Examples:

- Issuer × credential-issuance: split into "producer (VC-signing)"
  and "consumer (VP DID-auth verification)" steps. Producer MUSTs
  reference "≥1 of the supported options"; consumer MUSTs reference
  "all supported options".
- Wallet × credential-acceptance: producer (DID-auth VP) ≥1;
  consumer (VC verification) all.
- Wallet × credential-presentation: producer (VP signing) ≥1;
  consumer slot is minor (process the request — no signature
  verification typically).
- Verifier × credential-request-and-verification: consumer (VC + VP
  verification) all; no producer.

### Q6 — Do we encode the supported-option list as structured data on `AdditiveProfile`?

**Decision:** Not in v1. Keep the schema unchanged; put the
option declarations in the additive profile's `description` plus a
notes-style preamble on each checklist. A typed
`supportedCryptosuites` accessor can be added later when a runner
needs it (the runner doesn't ship in this plan).

### Q7 — Runner integration?

**Decision:** No runner integration in this plan. vcalm has no
issuer-runner today; the open-skill-alignment runner is only wired
to `ob3-direct-delivery`. Stable requirement `id`s are still set
so the bundle is runner-ready.

### Q8 — Should the existing `oid4-ecdsa` profile also reference this additive?

**Decision:** No, not in this plan. The user only asked for vcalm.
`oid4-ecdsa` is content-only and already mandates ECDSA singly.
Adding the additive there is a future cleanup that should be its own
plan because the rename mirror (`oid4-ecdsa` → `oid4`?) would
balloon scope.

## Notes

- The user said: "we should say 'SHOULD' not 'MUST' in terms of
  resolving to CTDL resources" — that was for the open-skill-alignment
  plan, not this one. For this plan, the user's language was
  prescriptive: producers MUST support ≥1, consumers MUST support
  all. So use MUST on those.
- Earlier in the same session the user explicitly said "make the
  reasonable call and continue; they'll redirect if needed." That
  authorization applies to this plan — proceed through phases
  without pausing on minor judgment calls.
- The conversation summary records that prior plans (including
  `2026-05-15-open-skill-alignment-additive-profile`) are still
  **uncommitted**. Treat the working tree as in-flight; don't try
  to commit anything except at the explicit stop-for-review point at
  the end of this plan.

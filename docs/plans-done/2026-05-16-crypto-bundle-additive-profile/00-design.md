# 00-design — Crypto-bundle additive profile

## Scope of work

Ship a new additive interoperability profile,
`data-integrity-cryptosuites`, that declares two complete cryptosuite
options — `eddsa-rdfc-2022` + Ed25519 and `ecdsa-rdfc-2019` + P-256 —
and applies them to the existing `vcalm` base profile (renamed from
`vcalm-eddsa`). The base profile's checklists become cryptosuite-neutral;
the additive carries the concrete option declarations and the
producer/consumer split per workflow.

No runtime check-runner integration ships in this plan. Stable
requirement `id`s are set so future runner wiring is a registry-only
change.

## File structure

```
src/lib/interop/
├── profile-schema.ts                                                  # UPDATE: ProfileSlug enum: 'vcalm-eddsa' → 'vcalm'
├── profile-schema.test.ts                                             # UPDATE: 3 string literals
├── accessors.test.ts                                                  # UPDATE: 6 string literals
├── additive-profile-schema.ts                                         # UPDATE: AdditiveProfileSlug enum adds 'data-integrity-cryptosuites'
├── profiles/
│   ├── all-profiles.ts                                                # UPDATE: import path
│   └── vcalm/                                                         # RENAME from vcalm-eddsa/
│       ├── profile.ts                                                 # UPDATE: id, slug, name, keyComponents, description
│       ├── index.ts                                                   # UPDATE: const name `vcalmEddsa` → `vcalm`
│       ├── issuer-credential-issuance.ts                              # UPDATE: cryptosuite-neutral language; profile slug
│       ├── wallet-credential-acceptance.ts                            # UPDATE: same
│       ├── wallet-credential-presentation.ts                          # UPDATE: same
│       └── verifier-credential-request-and-verification.ts            # UPDATE: same
└── additive-profiles/
    ├── all-additive-profiles.ts                                       # UPDATE: include dataIntegrityCryptosuites
    └── data-integrity-cryptosuites/                                   # NEW dir
        ├── profile.ts                                                 # NEW: id, slug, name, description, appliesToBaseProfiles
        ├── index.ts                                                   # NEW: composes AdditiveProfile + exports
        ├── issuer-credential-issuance.ts                              # NEW: checklist with producer + consumer requirements
        ├── wallet-credential-acceptance.ts                            # NEW: same shape
        ├── wallet-credential-presentation.ts                          # NEW: same shape
        └── verifier-credential-request-and-verification.ts            # NEW: consumer-only checklist

src/lib/components/interop/
├── runnable-checklist/RunnableChecklist.stories.svelte                # UPDATE: 'vcalm-eddsa' → 'vcalm'
├── workflow-checklist/WorkflowChecklist.stories.svelte                # UPDATE: same
└── profile-summary/ProfileSummary.stories.svelte                      # UPDATE: same

src/lib/pages/runnable-wallet-acceptance/
└── RunnableWalletAcceptancePage.svelte                                # UPDATE: 'vcalm-eddsa' → 'vcalm'

src/routes/wallet/
├── [workflow]/[profile]/+page.ts                                      # UPDATE: shadow filter slug
└── credential-acceptance/
    └── vcalm/                                                         # RENAME from vcalm-eddsa/
        └── run/+page.svelte                                           # (folder rename only)
```

## Conceptual architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ AdditiveProfile  (data-integrity-cryptosuites)                  │
│                                                                 │
│   appliesToBaseProfiles: ['vcalm']                              │
│   description: "Two complete cryptosuite options. Producers MAY │
│                 pick from EITHER; consumers MUST verify BOTH."  │
│                                                                 │
│   checklists:                                                   │
│     ┌────────────────────────────────────────────────────────┐  │
│     │ issuer × credential-issuance                           │  │
│     │   step "Producer: sign the VC"            (≥1 option)  │  │
│     │   step "Consumer: verify the DID-auth VP" (all opts.)  │  │
│     ├────────────────────────────────────────────────────────┤  │
│     │ wallet × credential-acceptance                         │  │
│     │   step "Producer: DID-auth VP signing"    (≥1 option)  │  │
│     │   step "Consumer: verify the issued VC"   (all opts.)  │  │
│     ├────────────────────────────────────────────────────────┤  │
│     │ wallet × credential-presentation                       │  │
│     │   step "Producer: sign the VP"            (≥1 option)  │  │
│     ├────────────────────────────────────────────────────────┤  │
│     │ verifier × credential-request-and-verification         │  │
│     │   step "Consumer: verify VC + VP"         (all opts.)  │  │
│     └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │  applies to (declared)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ Profile  (vcalm, renamed from vcalm-eddsa)                      │
│                                                                 │
│   id: 'vcalm-v1'                                                │
│   slug: 'vcalm'                                                 │
│   keyComponents: …                                              │
│     • Cryptographic Suite: see data-integrity-cryptosuites      │
│       additive (EdDSA or ECDSA)                                 │
│     • DID Methods: did:web, did:key (key type per cryptosuite)  │
│   description: "Browser-based credential exchange using VCALM   │
│                  Exchanges over Open Badges 3.0 credentials."   │
│                                                                 │
│   checklists: 4× cryptosuite-neutral                            │
└─────────────────────────────────────────────────────────────────┘
                          │
              ┌───────────┴──────────────┐
              ▼                          ▼
   /profiles/vcalm                 /profiles/data-integrity-cryptosuites
   /issuer/credential-issuance/vcalm
   /wallet/credential-acceptance/vcalm   (runnable shadow)
   /wallet/credential-presentation/vcalm
   /verifier/credential-request-and-verification/vcalm
```

## Style conventions

- **ZodFactory** for any new schema. We're only adding one new slug
  literal to `AdditiveProfileSlug`; no new schemas needed.
  Pattern:
  ```ts
  export const AdditiveProfileSlug = ZodFactory(
  	z.enum(['open-skill-alignment', 'data-integrity-cryptosuites'])
  );
  ```
- **Factory functions, not classes.** Doesn't really apply this round
  — we're producing values, not services.
- **Provider system.** Doesn't apply — no new services.
- **Domain-first layout.** New additive profile lives at
  `src/lib/interop/additive-profiles/data-integrity-cryptosuites/`,
  mirroring `open-skill-alignment/`. Each checklist gets its own file.
- **File size.** Keep checklist files ≤200 lines. Producer + consumer
  in the same file is fine (each is a single `ChecklistStep`).
- **Naming.** Slug = `data-integrity-cryptosuites` (kebab-case).
  Const = `dataIntegrityCryptosuites` (camelCase). Folder matches slug.
- **Import order.** Per `docs/style/file-organization.md`: external
  packages, then `$lib/...`, then relative; blank line between groups.
- **Documentation.** TSDoc on each new exported const (the
  AdditiveProfile, the meta object, each `WorkflowChecklist`). Comment
  the producer/consumer split where it lives.
- **Stable requirement ids.** Use
  `data-integrity-cryptosuites.<role>.<role>.<workflow>.<step>.<assertion>`
  shape:
  - `data-integrity-cryptosuites.issuer.credential-issuance.producer.cryptosuite-supported` (MUST ≥1)
  - `data-integrity-cryptosuites.issuer.credential-issuance.consumer.verify-vp-all-options` (MUST all)
  - etc.
- **No new components or stories.** The existing `AdditiveProfileCard`
  - `/profiles` + `/profiles/[slug]` pages already render generic
    additive profiles; the new slug should drop in without UI changes.

## Risks / non-goals

- **Out of scope:** Runner integration (no `verify-vp` automation
  ships; the runnable wallet-acceptance route is unaffected aside
  from the slug rename).
- **Out of scope:** Applying the additive to `oid4-ecdsa`. The user
  asked only about vcalm. Doing oid4 here would require a parallel
  rename + neutralization pass; defer to a follow-up plan.
- **Out of scope:** Combined checklist view ("show base + additive
  together"). The existing `/issuer/[workflow]/[profile]` page renders
  the base checklist only. A combined view is an enhancement that
  belongs in its own plan; the existing copy on `/profiles/<additive>`
  already tells users to open the base checklist to see the combined
  view, which is currently a known gap.
- **Risk: Conflicting requirements.** After renaming, the vcalm base
  checklists are cryptosuite-neutral but reference the additive in
  prose ("see the data-integrity-cryptosuites additive for supported
  cryptosuites and key types"). That coupling is intentional — the
  additive is described as required-for-completeness in the base
  profile description and `keyComponents`.
- **Risk: Drift between the source `vcalm-eddsa.md` guide and the
  renamed base.** The source guide in
  `strada-ecosystem-coordination-guide/profiles/vcalm-eddsa.md` still
  names the EdDSA suite directly. That guide is the source of truth
  for the _original_ profile; the suite-internal rename does not need
  to be mirrored upstream in this plan.

# Summary — Crypto-bundle additive profile

Date completed: 2026-05-16

## What shipped

- **Renamed base profile** `vcalm-eddsa` → `vcalm`. The base profile is
  now cryptosuite-neutral: its `keyComponents` and four checklists
  point at the new additive for the concrete cryptosuite / key-type /
  DID-method choices, rather than hard-coding `eddsa-rdfc-2022` +
  Ed25519.
- **New additive profile** `data-integrity-cryptosuites` declaring
  two complete cryptosuite options:
  - EdDSA / Ed25519 / `eddsa-rdfc-2022` (did:web, did:key)
  - ECDSA / P-256 / `ecdsa-rdfc-2019` (did:web, did:key)
- **Producer / consumer split** across all four vcalm workflows:
  - Issuer × credential-issuance — producer step (sign VC, ≥1 option) +
    consumer step (verify DID-auth VP, all options)
  - Wallet × credential-acceptance — producer step (sign DID-auth VP,
    ≥1 option) + consumer step (verify issued VC, all options)
  - Wallet × credential-presentation — producer-only (sign VP, ≥1 option;
    preserve embedded VC proofs verbatim)
  - Verifier × credential-request-and-verification — consumer-only
    (verify VP + embedded VC proofs, all options)
- **Stable requirement ids** on every new additive requirement —
  pattern `data-integrity-cryptosuites.<role>.<workflow>.<step-side>.<assertion>`.
  Ready for runner-side registration in a follow-up plan.

## Files changed

- `src/lib/interop/profile-schema.ts` — `ProfileSlug` enum
  `'vcalm-eddsa'` → `'vcalm'`.
- `src/lib/interop/additive-profile-schema.ts` — `AdditiveProfileSlug`
  enum adds `'data-integrity-cryptosuites'`.
- `src/lib/interop/profile-schema.test.ts` — 3 string literals updated.
- `src/lib/interop/accessors.test.ts` — 6 string literals updated; 2
  new tests covering the data-integrity-cryptosuites additive.
- `src/lib/interop/profiles/vcalm/` — renamed folder; `profile.ts`,
  `index.ts`, and 4 checklist files updated for slug + neutralized
  cryptosuite/key-type language.
- `src/lib/interop/profiles/all-profiles.ts` — import path + const
  rename.
- `src/lib/interop/additive-profiles/data-integrity-cryptosuites/` —
  new folder with `profile.ts`, `index.ts`, and 4
  `WorkflowChecklist` files.
- `src/lib/interop/additive-profiles/all-additive-profiles.ts` —
  registers the new additive.
- `src/lib/components/interop/runnable-checklist/RunnableChecklist.stories.svelte`
- `src/lib/components/interop/workflow-checklist/WorkflowChecklist.stories.svelte`
- `src/lib/components/interop/profile-summary/ProfileSummary.stories.svelte`
- `src/lib/pages/runnable-wallet-acceptance/RunnableWalletAcceptancePage.svelte`
- `src/routes/wallet/[workflow]/[profile]/+page.ts` — shadow filter
  slug.
- `src/routes/wallet/credential-acceptance/vcalm/` — renamed route
  folder.

## Validation evidence

- `pnpm turbo validate` passed locally (6/6 tasks: prettier, eslint,
  typescript, svelte-check, vitest, build).
- 193 vitest cases pass.
- `grep -rn "vcalm-eddsa\|vcalmEddsa" src` returns empty (only the
  human-readable fixture phrase `"VCALM-EdDSA wallet acceptance"` in
  `ob3-credential-template.ts` remains, intentionally — it's content
  text on a sample credential, not a slug reference).

## Deferred follow-ups

1. **Combined-view rendering on `/<role>/<workflow>/<base>` pages.**
   Today, the data-integrity-cryptosuites additive is discoverable from
   `/profiles/data-integrity-cryptosuites` but the base-profile checklist
   page does not surface its existence. The existing copy on the additive
   detail page even tells users to "open the base profile's checklist
   to see the combined view" — that combined view is not implemented.
2. **Apply `data-integrity-cryptosuites` to `oid4-ecdsa`.** The same
   bundle conceptually applies to oid4. If the team wants symmetry,
   that's a parallel rename (oid4-ecdsa → oid4) + checklist
   neutralization pass + add to `appliesToBaseProfiles`. Out of scope
   here per user direction.
3. **Runner integration.** Register check functions in the issuer-runner
   for the new requirement ids. vcalm has no issuer-runner today;
   stand one up (mirror `runnable-issuer-direct-issuance` for the
   exchange-based vcalm flow), or extend the existing wallet-acceptance
   runnable to surface the additive's content checklist alongside its
   exchange-runner output.
4. **Source-of-truth doc rename.** The upstream
   `strada-ecosystem-coordination-guide/profiles/vcalm-eddsa.md`
   still names the EdDSA suite directly. Decide whether to rename /
   regenerate that file to match this repo's neutral base slug.

## Notes

- The plan procedure (`.cursor/commands/plan.md`) ends with "STOP FOR
  HUMAN REVIEW before committing". The proposed commit message is in
  `03-cleanup-and-validation.md` §03.5. The working tree currently
  carries unrelated uncommitted work from prior plans
  (open-skill-alignment, exchange-runner, oid4vci-protocol-option,
  etc.) — scope the `git add` to this plan's files only unless the
  user asks otherwise.

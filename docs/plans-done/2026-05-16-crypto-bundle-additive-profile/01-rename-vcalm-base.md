# Phase 01 — Rename `vcalm-eddsa` → `vcalm` and neutralize base checklists

## Scope of phase

Rename the base profile slug + folder from `vcalm-eddsa` to `vcalm`,
update every reference in `src/`, and rewrite the four base checklists
so they refer to the cryptosuite/DID-method choices generically (the
additive profile we add in Phase 02 owns the concrete options).

This phase ends with `pnpm turbo validate` green; nothing about the
new additive ships in this phase yet.

## Code organization reminders

- Prefer a granular file structure, one concept per file.
- Place more abstract things, entry points, and tests **first**.
- Place helper utility functions **at the bottom** of files.
- Any temporary code gets a `TODO` comment with the plan name so the
  cleanup phase finds it.

## Style conventions

- Keep checklist files ≤200 lines.
- `ZodFactory` for any schema change (the `ProfileSlug` enum update).
- TSDoc preserved or rewritten as the file changes substantively.
- Import order per `docs/style/file-organization.md`: external → `$lib`
  → relative.
- No `as const` on `appliesToBaseProfiles`-style arrays — use
  `satisfies` to keep Zod's `parse()` happy with mutable arrays.
  (The open-skill-alignment plan encountered this; reuse the
  resolution.)

## Implementation details

### 01.1 — Update the slug enum

`src/lib/interop/profile-schema.ts` line 26:

```ts
export const ProfileSlug = ZodFactory(z.enum(['vcalm', 'oid4-ecdsa', 'ob3-direct-delivery']));
```

### 01.2 — Rename the profile folder

```
git mv src/lib/interop/profiles/vcalm-eddsa src/lib/interop/profiles/vcalm
```

(If git is not initialized for these paths, do a plain `mv`. The
working tree currently has uncommitted changes from a prior plan —
verify with `git status` before / after.)

### 01.3 — Update files inside `src/lib/interop/profiles/vcalm/`

- `profile.ts`
  - `id: 'vcalm-v1'`
  - `slug: 'vcalm' as const`
  - `name: 'VCALM Profile'`
  - `description`: drop the EdDSA hard-coding. Suggested copy:
    > Browser-based credential exchange using VCALM Exchanges over
    > Open Badges 3.0 credentials, with Data Integrity proofs whose
    > cryptosuite/key choices are declared by the
    > **data-integrity-cryptosuites** additive profile.
  - `keyComponents`:
    - Keep: Exchange Protocol, Credential Format, Credential Schema,
      Status Method, Recipient Identifiers.
    - Replace `Cryptographic Suite` with:
      `{ label: 'Cryptographic Suite', value: 'See data-integrity-cryptosuites additive' }`
    - Replace `DID Methods` value with:
      `did:web, did:key (key type per chosen cryptosuite)`
  - Export const renames to `vcalmProfileMeta` (was
    `vcalmEddsaProfileMeta`).
- `index.ts`
  - Import path: `./profile.js` unchanged.
  - Exported const renamed `vcalmEddsa` → `vcalm`. Drop the meta
    rename if the spread is updated.
- `issuer-credential-issuance.ts`
  - `profile: 'vcalm'`.
  - Rewrite the 4th step's requirements to remove
    `eddsa-rdfc-2022` and `Ed25519` specifics. Suggested rewrites:
    - "Use a Data Integrity Proof. The supported cryptosuite +
      key-type combinations are declared by the
      data-integrity-cryptosuites additive profile."
    - "Use a did:web or did:key issuer identifier whose verification
      method matches the chosen cryptosuite's key type."
- `wallet-credential-acceptance.ts`
  - `profile: 'vcalm'`.
  - Step "Receive and verify the credential": drop the
    `eddsa-rdfc-2022` and Ed25519 specifics; refer to "supported
    cryptosuites and key types declared by the
    data-integrity-cryptosuites additive profile."
  - Step "Respond to the DIDAuthentication request": drop "EdDSA
    signatures" and "Ed25519 key pairs"; refer to the additive's
    supported options.
  - Step "Accept and store the credential": drop "did:web or did:key
    DID methods" (these become consumer-required in the additive).
    Replace with neutral wording referring to the additive.
- `wallet-credential-presentation.ts`
  - `profile: 'vcalm'`.
  - Same neutralization for "Create verifiable presentations with
    EdDSA signatures" and "Generate and manage Ed25519 key pairs".
- `verifier-credential-request-and-verification.ts`
  - `profile: 'vcalm'`.
  - Drop the "Support `eddsa-rdfc-2022` proofs." requirement —
    consumer requirements (verify all) live in the additive.
  - Drop the holder-DID resolution language; the additive owns it.

> **Important:** Don't _delete_ the cryptosuite topic from the base
> checklists entirely — leave a single concise pointer in each
> affected step like:
>
> > Use Data Integrity proofs per the
> > [data-integrity-cryptosuites](/profiles/data-integrity-cryptosuites)
> > additive profile (supported cryptosuite/key-type/DID-method options).
>
> Format the link as plain markdown text inside the requirement string;
> existing `ChecklistRequirement.text` is rendered as text today, so
> avoid relying on inline links — write it as a parenthetical so it
> reads cleanly as plain text.

### 01.4 — Update `src/lib/interop/profiles/all-profiles.ts`

```ts
import { vcalm } from './vcalm/index.js';
// …
export const allProfiles = [vcalm, oid4Ecdsa, ob3DirectDelivery];
```

### 01.5 — Update `src/lib/interop/accessors.test.ts`

Replace every `'vcalm-eddsa'` literal with `'vcalm'`. Update the
test title from "vcalm-eddsa has 4 checklists" to "vcalm has 4
checklists". Update the additive test that previously asserted
`additiveProfilesForBaseProfile('vcalm-eddsa')` → `[]`: it should
now check `additiveProfilesForBaseProfile('vcalm')` and still
return `[]` until Phase 02 adds the new additive.

### 01.6 — Update `src/lib/interop/profile-schema.test.ts`

Three string literals (`'vcalm-eddsa'` → `'vcalm'`) plus update any
test title that mentions the old slug.

### 01.7 — Update components and pages

For each of these files, replace the literal `'vcalm-eddsa'` with
`'vcalm'`:

- `src/lib/components/interop/runnable-checklist/RunnableChecklist.stories.svelte`
- `src/lib/components/interop/workflow-checklist/WorkflowChecklist.stories.svelte`
- `src/lib/components/interop/profile-summary/ProfileSummary.stories.svelte`
- `src/lib/pages/runnable-wallet-acceptance/RunnableWalletAcceptancePage.svelte`

### 01.8 — Update the wallet route + folder rename

- `src/routes/wallet/[workflow]/[profile]/+page.ts`: update the
  shadow filter to use `'vcalm'`.
- Rename the runnable shadow folder:

  ```
  git mv src/routes/wallet/credential-acceptance/vcalm-eddsa \
        src/routes/wallet/credential-acceptance/vcalm
  ```

- Verify `src/routes/wallet/credential-acceptance/vcalm/run/+page.svelte`
  (post-rename) does not embed the old slug.

### 01.9 — Double-check there are no remaining hits

```sh
grep -rn "vcalm-eddsa" src
```

Should be empty after this phase (excluding `docs/plans-done/…`
historical files, which we leave untouched).

`ob3-credential-template.ts` contains the human-readable phrase
"Demonstrated VCALM-EdDSA wallet acceptance" inside the sample
credential payload — leave it as-is (it's content text on a
fixture, not a slug reference; rewriting it is out of scope and
would burn diff for no functional gain).

## Validation

From the project root:

```sh
pnpm turbo check
pnpm turbo test
```

(Use `pnpm turbo validate` for the full set if you also want a
build.)

Expected: green. The build step will fail until SvelteKit reconciles
the renamed route — run `pnpm turbo check` first, and if it succeeds
you can run `pnpm turbo build` to flush the route graph.

Do **not** commit between phases.

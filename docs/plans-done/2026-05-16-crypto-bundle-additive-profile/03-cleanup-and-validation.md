# Phase 03 — Cleanup & validation

## Scope of phase

Sweep TODOs and dead references, run the full validate set, write a
summary, move the plan to `docs/plans-done/`, and stop for human
review before committing.

## Code organization reminders

- Grep for stale references one last time.
- Don't add new TODOs in this phase; remove any introduced during
  earlier phases.

## Style conventions

- This phase is docs / housekeeping only.

## Implementation details

### 03.1 — Sweep references

```sh
grep -rn "vcalm-eddsa" src
grep -rn "vcalmEddsa" src
grep -rn "TODO" src/lib/interop/additive-profiles/data-integrity-cryptosuites
grep -rn "TODO" src/lib/interop/profiles/vcalm
```

The first two must be empty under `src/` (we leave `docs/plans-done/`
alone). The grep for TODOs should be empty unless a phase
intentionally left one — if so, resolve it here.

### 03.2 — Run the full validate set

From the project root:

```sh
pnpm turbo validate
```

This runs prettier, eslint, typescript, svelte-check, vitest, and
build. All six tasks must pass.

If lint or prettier finds nits introduced by the rename diff:

```sh
pnpm turbo fix
```

Then re-run validate.

### 03.3 — Write the summary

Create `docs/plans/2026-05-16-crypto-bundle-additive-profile/summary.md`
covering:

- What shipped (the additive profile + the base rename).
- Files changed (summary by area).
- Open items / deferred follow-ups (see list below).
- Validation evidence (just `pnpm turbo validate` passed).

Deferred follow-ups to capture:

- Combined-view rendering on `/<role>/<workflow>/<base-profile>`
  pages (today the additive is discoverable from
  `/profiles/<additive>` but not surfaced on the base-profile
  checklist page).
- Apply `data-integrity-cryptosuites` to `oid4-ecdsa` (and possibly
  rename it to `oid4`).
- Runner integration: register check functions for the
  `data-integrity-cryptosuites` requirement ids (likely against a
  new runnable issuer/wallet/verifier path for vcalm).
- Upstream source-of-truth docs in
  `strada-ecosystem-coordination-guide/profiles/vcalm-eddsa.md` —
  decide whether to rename / regenerate that file to match this
  repo's new base slug.

### 03.4 — Move the plan to plans-done

```sh
mv docs/plans/2026-05-16-crypto-bundle-additive-profile \
   docs/plans-done/2026-05-16-crypto-bundle-additive-profile
```

### 03.5 — Stop for human review

Do **not** commit. Surface the completion summary to the user and
the proposed commit message below; wait for explicit approval.

Proposed commit message:

```
feat(interop): data-integrity-cryptosuites additive profile + vcalm rename

- Rename base profile `vcalm-eddsa` → `vcalm`; neutralize its
  cryptosuite/key-type/DID-method language to defer those choices to
  the new additive.
- Add `data-integrity-cryptosuites` additive profile declaring two
  complete options (EdDSA + ECDSA) with producer/consumer split
  across all four vcalm workflows. Stable requirement ids set for
  future runner registration.
- Update the slug enum, registry, accessor tests, route folder, and
  component story references for the rename.
```

After approval:

```sh
git add <paths>
git commit -m "$(cat <<'EOF'
feat(interop): data-integrity-cryptosuites additive profile + vcalm rename

…full body here…

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Scope the `git add` to only the files this plan touched. The
working tree currently carries unrelated uncommitted work from
prior plans; do not bundle that into this commit unless the user
asks for it.

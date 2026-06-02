# Phase 6 — Cleanup & validation

## Cleanup & validation

1. `git diff` review:
   - Search the diff for `TODO`, `FIXME`, `console.log`, `debugger`,
     and any temporary scaffolding. Remove or convert to a real
     follow-up.
   - Confirm no unused imports or variables remain (eslint will catch
     most).
   - Confirm the `qrcode` dependency was added cleanly (no stray
     `@types/...` since `qrcode` ships its own types).
2. Validation commands (run from repo root):
   ```
   pnpm turbo validate
   ```
   Runs `check + test + build`. All three must pass.
3. Storybook smoke: `pnpm turbo storybook` boots without errors;
   eyeball the four `RunnableChecklist` story states in light + dark.
4. Manual UI walk:
   - With `pnpm turbo dev:full` running:
     - `/` still renders the new home; AppHeader still has Profiles.
     - `/issuer`, `/wallet`, `/verifier` still render role landings.
     - `/wallet/credential-acceptance/vcalm-eddsa` renders the new
       split layout. CTA initiates exchange. QR + copy work. Step
       indicators progress as a wallet hits the URL.
     - The other 9 checklist routes still render the static
       `WorkflowChecklist`.
     - `/profiles` and `/profiles/<slug>` unchanged.
   - With `pnpm turbo dev` (no services):
     - `/wallet/credential-acceptance/vcalm-eddsa` loads and shows the
       inline error / disabled-runner message when CTA is clicked.
5. Production build sanity: `pnpm turbo build` should still produce
   prerendered pages for the 9 unaffected checklist routes; the
   wallet-acceptance × VCALM combo is _not_ in `build/prerendered/wallet/`
   under that path (it's served at runtime).

## Plan cleanup

1. Append a `summary.md` to the plan directory describing what shipped.
2. Move the plan directory from `docs/plans/` to `docs/plans-done/`.

## Commit

Once everything compiles and passes:

- Stop for human review of a proposed Conventional Commit message:

  ```
  feat(runner): live exchange runner for wallet acceptance × VCALM-EdDSA

  - Docker compose for local DCC transaction + signing services
  - turbo dev:full task running app + storybook + services in parallel
  - new `live` (warm flame) palette tokens for run-state UI
  - typed TransactionServiceClient + SvelteKit /api/exchange-runner/* endpoints
  - RunnableChecklist split-grid layout component (storybook coverage)
  - wallet-acceptance × VCALM-EdDSA route now drives a real exchange:
    QR + copy interaction URL, 2s polling, step-level run state
  ```

- After approval, commit. **Do not push automatically.**

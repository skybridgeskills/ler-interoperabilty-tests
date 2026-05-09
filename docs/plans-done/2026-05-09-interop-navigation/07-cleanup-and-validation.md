# Phase 7 — Cleanup & validation

## Scope of phase

Final polish + final validation gate.

## Cleanup & validation

1. `git diff` review:
   - Search the diff for `TODO`, `FIXME`, `console.log`, debug prints, and
     temporary scaffolding. Remove or convert to a real follow-up.
   - Confirm no unused imports / variables remain (eslint will catch most).
2. Validation commands (run from repo root):
   ```
   pnpm turbo validate
   ```
   This runs `check + test + build`. All three must pass.
3. Storybook smoke: `pnpm turbo storybook` should boot without errors.
4. Manual UI walk:
   - `/` shows the new home with the three sections.
   - `/issuer`, `/wallet`, `/verifier` show role landings with workflow
     cards + profile sub-options.
   - `/issuer/credential-issuance/vcalm-eddsa` (and a sample of others)
     shows the ordered checklist.
   - `/profiles` and `/profiles/vcalm-eddsa` (and the other two) render the
     index and detail pages.
   - All header / footer links navigate without 404.

## Plan cleanup

1. Append a `summary.md` to the plan directory describing what shipped.
2. Move the plan directory from `docs/plans/` to `docs/plans-done/`.

## Commit

Once the plan is complete, validate, and the user has reviewed:

- Stop for human review of a proposed Conventional Commit message:

  ```
  feat(nav): role × workflow × profile checklist navigation

  - Typed interop content module (profiles, workflows, roles, checklists)
  - Role landing pages with workflow + profile sub-links
  - Workflow × profile checklist routes with prerendered entries
  - Profile index + detail pages
  - Home overview of all workflows; Profiles link in AppHeader
  ```

- After approval, commit the changes.

Do NOT push to `origin` automatically.

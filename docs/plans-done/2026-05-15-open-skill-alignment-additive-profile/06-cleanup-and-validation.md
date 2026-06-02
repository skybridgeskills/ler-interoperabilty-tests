# Phase 06 — Cleanup & validation

## Scope of phase

Final pass: clear out temporary code, run full validation, write
`summary.md`, move the plan into `docs/plans-done/`, propose a commit
message, **stop for human review** before committing.

## Code Organization Reminders

- Nothing temporary should ship. Grep the diff for TODOs / debug
  prints / `console.log` / `eslint-disable` blocks that were added in
  earlier phases.
- Resolve TODOs added in phase 01 (the stub-state tests in
  `accessors.test.ts` should already be flipped to positive
  assertions by phase 02).
- Resolve TODOs added in phase 02 (`all-additive-profiles.ts`
  populated; `ChecklistRequirement.id` rolled out for the requirements
  the registry covers).
- Confirm no requirement registered in `checks/index.ts` is missing
  from a checklist (and vice versa: every requirement keyed in the
  registry exists on a real checklist).
- Confirm file sizes — split anything that grew past ~200 lines while
  implementing.

## Style conventions

This phase is documentation + maintenance only. No new code paths.

## Implementation Details

### Cleanup steps

1. From the suite repo root:
   ```sh
   git diff --stat
   git diff -U0 | grep -nE 'TODO|XXX|console\.(log|debug)|eslint-disable' || true
   ```
   Resolve every match (delete, fix, or convert to a tracked follow-up
   note in `summary.md`).
2. Re-read each phase file and tick off acceptance items in the
   design's "Acceptance criteria" section.
3. Run the formatter/linter auto-fix:
   ```sh
   pnpm turbo fix
   ```
4. Run full validation:
   ```sh
   pnpm turbo validate    # = check + test + build
   ```
   Fix any errors. The build step catches missing SvelteKit route
   exports, type drift, and storybook story issues.
5. Manual smoke (one-time, do not script):
   ```sh
   pnpm dev
   # then in a browser:
   #   /profiles                                                       — see the new "Additive profiles" section
   #   /profiles/open-skill-alignment                                  — detail page renders, lists base profiles
   #   /issuer/direct-credential-issuance/ob3-direct-delivery          — "Run this" CTA present
   #   /issuer/direct-credential-issuance/ob3-direct-delivery/run      — paste each sample, toggle additive,
   #                                                                     hit Verify, confirm all-pass report
   ```
   Optionally run the env-gated verifier-core smoke test:
   ```sh
   RUN_VERIFIER_CORE_SMOKE=1 pnpm turbo test
   ```

### Write `summary.md`

`docs/plans/2026-05-15-open-skill-alignment-additive-profile/summary.md`
captures what shipped, what was deferred, and any follow-ups
discovered during implementation. Structure:

```markdown
# Summary — Open Skill Alignment additive profile

## Shipped

- New `AdditiveProfile` concept …
- `open-skill-alignment` populated …
- Check-runner + per-requirement registry …
- `POST /api/issuer-runner/verify` + `verifier-core` integration …
- Runnable page at `/issuer/direct-credential-issuance/ob3-direct-delivery/run` …
- `/profiles` lists additive profiles; `/profiles/open-skill-alignment` detail.

## Deferred / follow-ups

- Verifier-side runnable page for Direct Credential Verification.
- Additive profile across other base profiles (VCALM-EdDSA, OID4-ECDSA).
- Custom-data editor for alignment URLs / scale values in the runner.
- CTDL URL dereferencing.

## Notes for the next plan

- (anything surprising discovered along the way)
```

### Move plan files

```sh
mv docs/plans/2026-05-15-open-skill-alignment-additive-profile \
   docs/plans-done/2026-05-15-open-skill-alignment-additive-profile
```

## Commit

After all of the above passes — **stop and ask the user for review**
before committing. Propose this message structure:

```
feat(interop): open skill alignment additive profile + issuer runner

- Introduce AdditiveProfile concept (slug, schema, accessors).
- Add `open-skill-alignment` additive profile with issuer + verifier
  checklists and three signed sample credentials (RawScore, Percent,
  RubricCriterionLevel).
- Add typed check-runner + per-requirement registry covering the OB
  3.0 Direct Delivery issuer checklist and the open-skill-alignment
  additive issuer checklist.
- Add @digitalcredentials/verifier-core integration behind a typed
  client/fake and a POST /api/issuer-runner/verify endpoint.
- Ship a runnable issuer page at
  /issuer/direct-credential-issuance/ob3-direct-delivery/run that
  verifies a pasted credential and renders a per-requirement report.
- List additive profiles on /profiles and /profiles/<slug>.
```

Wait for human approval. After approval:

```sh
git add -A
git commit -m "$(cat <<'EOF'
feat(interop): open skill alignment additive profile + issuer runner

- Introduce AdditiveProfile concept (slug, schema, accessors).
- Add `open-skill-alignment` additive profile with issuer + verifier
  checklists and three signed sample credentials (RawScore, Percent,
  RubricCriterionLevel).
- Add typed check-runner + per-requirement registry covering the OB
  3.0 Direct Delivery issuer checklist and the open-skill-alignment
  additive issuer checklist.
- Add @digitalcredentials/verifier-core integration behind a typed
  client/fake and a POST /api/issuer-runner/verify endpoint.
- Ship a runnable issuer page at
  /issuer/direct-credential-issuance/ob3-direct-delivery/run that
  verifies a pasted credential and renders a per-requirement report.
- List additive profiles on /profiles and /profiles/<slug>.
EOF
)"
git status
```

Do not push without an explicit user request.

# Phase 5 — Cleanup + validation

## Scope

Final pass + the deferred-task documentation we promised in
`00-notes.md`.

## Cleanup

- `git diff` review:
  - Search for any `TODO`, `FIXME`, `console.log`, `debugger`, or
    temporary scaffolding introduced in this plan.
  - Confirm the only intentional TODO is the one inside
    `docker/README.md` describing the digest bump.
  - Confirm no unused imports remain.
- Update `docker/README.md` with the **digest-bump procedure** for
  whoever follows up. Place it under a new
  `## Bumping the dcc-transaction-service image` H2:

  ````md
  When the transaction-service image is republished with newer code,
  bump the pinned digest:

  ```sh
  docker pull skybridgeskills/dcc-transaction-service:<tag>
  docker inspect skybridgeskills/dcc-transaction-service:<tag> \
    --format '{{index .RepoDigests 0}}'
  ```
  ````

  Replace the `image:` line in `docker/compose.dev.yml` with the
  returned digest, then `pnpm dev:services:down && pnpm dev:services`.
  Sanity check that the new field flows through:

  ```sh
  curl -fsS http://localhost:4004/workflows/claim/exchanges/<id>/protocols \
    | jq .protocols.OID4VCI
  ```

  An `openid-credential-offer://?credential_offer_uri=…` value
  confirms the runner UI's OID4VCI tab will receive a real URL.

  ```

  ```

- Append a one-line note to the `Exchange runner — local DCC services`
  section of `.env.example` if the digest-bump introduces new env
  knobs (none expected).

## Plan cleanup

1. Append `summary.md` to the plan directory describing what shipped
   (mirror the format of prior plans — what changed, validation
   results, deferred items).
2. Move
   `docs/plans/2026-05-09-oid4vci-protocol-option/`
   to
   `docs/plans-done/2026-05-09-oid4vci-protocol-option/`.

## Validation

```
pnpm turbo validate
```

Runs `check + test + build`. All three must pass. Storybook smoke
(`pnpm turbo storybook`) is a manual visual check — confirm the
protocol selector toggles in both light and dark modes.

## Commit

Once everything compiles + tests pass, stop for human review of:

```
feat(runner): OID4VCI protocol option in the wallet-acceptance runner

- ExchangeProtocols schema gains an optional `OID4VCI` deep link
- ProtocolSelector tabs wire VCALM / OID4VCI choice through the
  ExchangeRunnerPanel and the runnable wallet-acceptance page
- InteractionQrCard takes a configurable header label; "Open in
  browser" affordance dropped to support custom URI schemes
- Storybook variants cover VCALM-only, OID4VCI-active, and the
  legacy-container fallback
- docker/README.md documents the digest-bump procedure for the
  dcc-transaction-service image with the corresponding service-side
  changes
```

After approval, commit. **Do not push automatically.**

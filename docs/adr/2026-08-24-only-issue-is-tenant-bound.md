# Only `issue` is tenant-bound

- **Status:** Accepted
- **Date:** 2026-08-24
- **Milestone:** M15 (P2)
- **Refines:** [`2026-08-22-pinned-issuing-through-a-tenant-map.md`](2026-08-22-pinned-issuing-through-a-tenant-map.md)

## Context

M12 gave `ScenarioAction` an optional `IssuingIntent` (`{ cryptosuite, didMethod }`)
so a scenario could pin what it issues, and routed it through
`resolveIssuingContext` against the deployment's tenant map. A pin the deployment
cannot serve returns a typed `CannotServe` and the scenario renders **blocked**.

That was right for `issue`. It was applied to **`deliver-direct`** as well, and
`present-to-verifier` was given no cryptosuite field at all — both of which were
wrong, for the same reason.

`deliver-direct` and `present-to-verifier` do not go through the transaction
service. They sign locally with `wallet-crypto`, which serves **both bundle
suites unconditionally** — no tenant, no token, no configuration. So:

- A locally-signed ECDSA hand-off would have resolved through the tenant map and
  rendered **blocked** on a single-tenant EdDSA deployment — a scenario refused
  as unservable by a deployment that could serve it perfectly well.
- `present-to-verifier` could not vary its suite at all, which made the DIC
  **verifier** axis unauthorable.

**Nothing exercised the defect, which is why it survived.** No shipped scenario
pinned a suite on `deliver-direct`; the M15 verifier axis (P5) is the first thing
that needed either behaviour.

The naive reading is what produced it: _blocked-ness follows minting_, and
`deliver-direct` does mint a credential. The distinction is not **whether**
something is minted but **who mints it**.

## Decision

**Only `issue` is tenant-bound**, because it is the only action the transaction
service mints. It keeps its `IssuingIntent`.

**`deliver-direct` and `present-to-verifier` carry a `LocallySignedSuite`** — a
plain `z.enum(['eddsa-rdfc-2022', 'ecdsa-rdfc-2019'])` in
`interop/scenarios/locally-signed-suite.ts`, client-safe, shared with
`receive-from-issuer.keyProofSuite`, which had already stated this principle for
itself. `deliver-direct` **loses `intent`** entirely.

Both routes resolve the suite as `action.cryptosuite ?? exchangeRunnerConfig.cryptosuite`
and no longer call `resolveIssuingContext`. The `isSignableSuite` guard stays —
that is a different failure (a deployment configured with a suite `wallet-crypto`
cannot sign), and it is a 400 about configuration, not about a pin.

## Consequences

- **`blocked` narrows to `issue` alone.** `blockedScenario` reads an intent only
  from an action that has one, so no locally-signed scenario can ever render
  disabled. Asserted directly: the six DIC verifier scenarios are checked against
  a single-tenant EdDSA config and must yield `{}`.
- **The DIC verifier axis becomes authorable**, and P5 authored it — six
  scenarios that would have been impossible to express the day before.
- **The principle is now symmetric.** `receive-from-issuer.keyProofSuite` already
  said "this is signed locally, so it is not a tenant question". Two of its three
  siblings now agree with it, and they share one type rather than three copies of
  an enum.
- **A fake was made honest, not a test weakened.** The fake scenario runner's
  `deliverDirect` hardcoded `cryptosuite: 'fake'`, which meant a route test could
  not tell a route that honours the caller's suite from one that ignores it. It
  now echoes the argument.
- **The tenant map's job is now much smaller than its shape.** The only caller
  that mints (`/api/exchange-runner/create`) consumes `tenantToken` and nothing
  else from the resolved context — `tenantName`, `cryptosuite` and `didMethod` on
  the `ok: true` arm have no reader. Whether `resolveIssuingContext` and
  `ExchangeRunnerConfig.tenants` still want their current shape is a live
  question, recorded in M15's planning `future.md` rather than acted on here.

## Alternatives considered

**Keep `intent` on `deliver-direct` and widen the tenant map** so a single-tenant
deployment advertises every suite `wallet-crypto` can sign. Rejected: it makes
the tenant map describe two unrelated things — what the transaction service will
mint, and what this app can sign locally — and a reader could not tell which a
given entry meant.

**Leave `present-to-verifier` without a cryptosuite and author the verifier axis
by pinning the issuance instead.** Rejected: the credential under test is one the
suite hands over, not one the operator's issuer mints, so pinning issuance would
measure the wrong system and would make the axis blockable for no reason.

**Treat it as a bug fix with no ADR.** Rejected: the rule _blocked-ness follows
minting_ was a plausible and recorded reading, and the correction — _it follows
who mints_ — is the kind of distinction that gets re-derived wrongly if it is not
written down.

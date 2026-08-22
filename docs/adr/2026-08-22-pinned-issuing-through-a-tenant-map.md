# Pinned issuing is a tenant swap, resolved behind `resolveIssuingContext`

- Status: accepted
- Date: 2026-08-22
- Context: M12 — the wallet page migration, and the first milestone in which a
  scenario actually **pins** a cryptosuite. `IssuingIntent` shipped in M1 with a
  seam and no substrate behind it; this fills the substrate in.

## Context

A `Scenario` step's `issue` or `deliver-direct` action may carry an
`IssuingIntent` — a `(cryptosuite, didMethod)` pair. **Absent means elective**
(the deployment chooses); **present means pinned**. The scenario schema has said
so since M1, and `resolveIssuingContext` has existed since M2 as the seam that
answers whether a pin is servable.

Nothing exercised it. M10 and M10a/M10b authored no `intent` — a verifier
scenario mints nothing. M11's planning run found the same of the **issuer**
family, correcting its own brief: in an issuer scenario the suite mints nothing
either, and the credential's cryptosuite is the operator's choice, merely
_observed_ in `proof.cryptosuite`. The only crypto choice the suite makes there
is its own holder key proof, which `wallet-crypto` generates locally and which
therefore can never be unservable — so it shipped as a plain `keyProofSuite`
field, not an intent.

**The first genuinely pinned scenario is a wallet scenario**: the
`data-integrity-cryptosuites` consumer axis asks whether the operator's wallet
can verify a credential in each cryptosuite of the bundle, and that question only
means something if the suite really issues one in each. So M12 had to answer how
a scenario gets the credential it asked for.

Discovery answered it, in the upstream services:

- `dcc-transaction-service`'s `claimWorkflow` calls
  `selectIssuerInstance(tenant, walletCryptosuites)` at **claim** time — after
  the wallet has presented — and `walletCryptosuites` is extracted from the
  **wallet's own** DIDAuth / key-proof presentation. The instance is then ranked
  newest-suite-first among the tenant's own instances.
- The **exchange creator has no say at all.** There is no cryptosuite field on
  the create request, and adding one would be a `dcc-transaction-service` code
  change, which this effort's scope explicitly excludes.
- A tenant's instances come from `TENANT_ISSUER_<n>_CRYPTOSUITE_<TENANT>`, and
  the signing key from `TENANT_SEED_<T>` / `TENANT_CRYPTOSUITE_<T>` on the
  signing service.

So the deployment's tenant, not the request, decides the cryptosuite — exactly
what `IssuingIntent`'s own docstring predicted when it said a scenario "can only
vary them by choosing a different tenant".

## Decision

**Pinning is a tenant swap, and `resolveIssuingContext` stays the whole seam.**

- `ExchangeRunnerConfig` grows `tenants: IssuingTenant[]` — each a
  `(name, token, cryptosuite, didMethod)`. Additional tenants read from an
  indexed environment family (`TRANSACTION_SERVICE_TENANT_2_NAME`, …), mirroring
  the shape of the upstream configuration it is describing.
- `resolveIssuingContext` selects from that list: an absent intent takes the
  default tenant, a present one takes the first tenant advertising both axes, and
  no match returns a typed `CannotServe` naming **every** value the deployment
  has for the failing axis.
- The create route stops discarding the resolved tenant and passes its token to
  `createIssuanceExchange`, which builds its `Authorization` header per request.

**The tenant rides entirely in the Bearer token.** `config.tenantName` never
appears in a transaction-service URL, so "mint under a different tenant" is one
header and nothing else — which is why a substrate this consequential costs so
little code.

**`tenants` is optional, and absent means "just the default one".** It is read in
exactly one place (`tenantsOf`), which falls back to the existing top-level
`tenantName`/`tenantToken`/`cryptosuite`/`didMethod`. A deployment that sets no
new environment variable behaves identically to before, and every hand-built
config — every fake, every test context — needs no tenant list.

**A single-tenant deployment is a supported, ordinary configuration.** Its
pinned scenarios render disabled with a typed reason and **keep their
requirements in the completion denominator**; the badge is blocked instead. A
shrinking denominator would let two deployments issue badges that look identical
and mean different things, which is the one thing the completion model exists to
prevent.

## Consequences

- **A pinned scenario issues what it claims to issue, or it does not run.** The
  failure mode this rules out is the dangerous one: minting under the default
  tenant and labelling the result ECDSA. The DIC accept scenarios additionally
  carry an automatic row reading `proof.cryptosuite` off the delivered
  credential, so even a misconfiguration is visible rather than silent.
- **Two tokens must agree.** The suite's `TRANSACTION_SERVICE_TENANT_2_TOKEN`
  and the container's `TENANT_TOKEN_ECDSA` are the same secret seen from two
  sides. They can drift, and the symptom — a credential in the wrong
  cryptosuite — reads like a service bug. `docker/README.md` says how to check.
- **A tenant configured without a token is dropped, not used.** Minting on an
  empty Bearer token fails with an opaque `unauthorized`; dropping it makes the
  scenario read as _unservable_, which is a legible disabled row.
- **`did:web` pinning is untested.** `IssuingIntent` carries `didMethod` and the
  resolver honours it, but a `did:web` tenant needs a publicly resolvable
  `TENANT_DID_URL_<T>` that local dev cannot provide. The axis exists and is
  exercised only as a blocked path. Said plainly so the absence does not read as
  coverage.
- **The dev compose stack was silently broken for signing, and is now fixed.**
  It set no `TENANT_SEED_*` at all, and `dcc-signing-service`'s `getTenantSeed`
  has no fallback — so a claim would have failed `404 Tenant doesn't exist`. It
  worked in practice only because this repo's developers run the DCC services as
  host processes with their own configuration. `TENANT_SEED_DEFAULT` is now
  declared.
- **The upstream selection rule still applies within a tenant.** Election is not
  removed; it is scoped. A tenant with several instances still ranks them against
  the wallet's advertised suites, which is why a _pinning_ tenant must declare
  exactly one.

## Alternatives considered

- **A per-exchange cryptosuite variable.** The obvious shape, and the one the
  seam's callers would have preferred. Rejected because it does not exist: the
  transaction service decides at claim time from the wallet's presentation, so
  honouring a creator's request means changing `dcc-transaction-service`, which
  this effort's scope excludes. Recorded here because it is the first thing a
  later reader will propose.
- **Signing locally with `deliver-direct`,** which already mints with an
  ephemeral `did:key` issuer in any suite we like. Rejected: a wallet cannot
  accept a downloaded file over OID4VCI, so an "OID4 acceptance in ECDSA" test
  that never touches OID4VCI misrepresents what was verified — the same "don't
  record a lie" principle that rejected faking the verifier pages in M10.
- **Dropping the pinned scenarios and measuring only what the operator's wallet
  happens to do**, as the issuer DIC scenarios do. Rejected: the consumer
  question is _can you verify this_, and it cannot be asked by observing. An
  observed-only wallet DIC axis would silently be a producer axis wearing the
  wrong name.
- **A JSON blob of tenants in one variable.** Rejected: a missing value becomes a
  parse error rather than a missing variable, and it would not resemble the
  upstream `TENANT_ISSUER_<n>_…_<TENANT>` configuration an operator is setting at
  the same time.

# Issuer OID4 test-wallet flow: pre-authorized-code coverage + exchange-scoped metadata discovery

- Status: accepted
- Date: 2026-07-02
- Context: Extend the test-wallet issuer flow (`2026-07-01-issuer-vcalm-test-wallet-flow`) to OID4VCI

## Context

`/issuer/credential-issuance/vcalm` lets a developer paste an interaction URL and drives the test
wallet as the holder, reporting per-requirement conformance inline. This ADR extends that pattern
to OID4VCI at `/issuer/credential-issuance/oid4`: the developer pastes an
`openid-credential-offer://` URL generated on their own issuer, and the test wallet runs the whole
OID4VCI 1.0 handshake as the holder.

The stateless, run-to-completion, tokenless, paste-only, SSRF-accepting, requirement-id→check
architecture is inherited wholesale from the VCALM ADR and not re-litigated here. This ADR records
only what is **new or different** for OID4VCI.

## Decision

1. **Pre-authorized-code happy path only; `n/a` the rest, honestly.** The test wallet exercises the
   OID4VCI **pre-authorized-code** flow end-to-end (offer → issuer/AS metadata → token → `c_nonce`
   → `di_vp` key proof → credential → verify). Clauses a happy-path pre-auth drive cannot positively
   verify — Authorization-Code-flow support, the OAuth authorization endpoint, and
   error-handling / proper-status-code MUSTs — resolve **`n/a` with a reason** ("needs an
   Authorization-Code-flow or a negative probe"), mirroring VCALM's ProblemDetails clauses. They are
   not downgraded to pass/fail; we do not claim a result we did not test.

2. **Exchange-scoped `.well-known` metadata discovery (RFC 8615 path-insertion).** Metadata URLs are
   built by **inserting** the well-known segment right after the host and preserving the Credential
   Issuer Identifier's path as a suffix — `https://h/tenant/x` →
   `https://h/.well-known/openid-credential-issuer/tenant/x` — via a shared `wellKnownMetadataUrl`
   helper. This matches what a per-exchange issuer (e.g. the DCC transaction service, which serves
   `/.well-known/openid-credential-issuer/workflows/:wf/exchanges/:id`) actually publishes, rather
   than forcing discovery to the domain root. The previous append form
   (`${issuer}/.well-known/...`) was a latent bug for any path-scoped issuer; the shared OID4VCI
   acceptance driver now uses the corrected helper too.

3. **Parallel OID4 driver + generalized check-runner; shared OID4VCI helpers.** OID4VCI observations
   differ from VCALM's, so a sibling `Oid4IssuerFlowDriver` + `Oid4IssuerFlowObservations` is used
   rather than overloading the VCALM types, and `runIssuerFlowChecks` is made profile-parametric
   (`{ profile, registry }`) to serve both. The OID4VCI protocol helpers (offer parse — including an
   inline `credential_offer=` form —, metadata discovery, token/nonce, credential extract) are
   factored into a shared `oid4vci/handshake.ts` reused by both the issuer-flow driver and the
   existing acceptance driver.

4. **Redacted per-step transcript.** The driver captures an ordered request/response transcript
   surfaced in the run response `raw` (rendered in the checklist's collapsible disclosures). The
   **access token is never serialized** into observations, the transcript, or run history — only
   `{ redeemed, cNonce }` is retained.

## Consequences

- A clean pre-auth run reports pass/`n/a` with no MUST failures; the four auth-code / authorization
  endpoint / error-handling MUSTs render `n/a` with clear reasons.
- The corrected `.well-known` construction changes the acceptance driver's metadata URLs for
  path-scoped issuers (bare-host issuers are unaffected); this is a behavior change made deliberately
  and covered by unit tests.
- The OID4 issuer profile currently carries Authorization-Code-flow MUSTs that the SBS transaction
  service (pre-authorized-code only) does not implement and the happy-path drive cannot exercise —
  see Follow-ups.

## Alternatives Considered

- **Flag the unexercised auth-code / error-handling MUSTs as findings (warn/fail).** Rejected as
  dishonest: the drive never tested them. `n/a` with a reason is the truthful state until a negative
  or Authorization-Code-flow probe exists.
- **Keep the append-form `.well-known` construction ("reuse verbatim").** Rejected: it 404s against
  path-scoped issuers (including the DCC issuer) and is non-conformant with RFC 8615 path-insertion.
- **Overload the VCALM `IssuerFlowObservations` / driver.** Rejected: OID4VCI's observation shape is
  materially different; a parallel driver + a generic check-runner is cleaner than a union type.

## Follow-ups

- Reconcile the OID4 issuer profile with pre-authorized-code-only reality across
  `strada-interoperability-guide` (source of truth) and this repo: drop or restate the
  Authorization-Code-flow / authorization-endpoint MUSTs (and de-duplicate the auth-code clause that
  appears in both step 1 and step 2) so the checklist reflects what is actually testable, rather than
  leaving them `n/a`.
- Negative-probe harness (malformed token / bad `di_vp` proof / replayed nonce → assert error
  status codes and bodies) to upgrade the error-handling / di-vp-rejection clauses from `n/a` to
  real checks.
- Authorization-Code-flow probe (browser redirect) if an issuer under test implements it.

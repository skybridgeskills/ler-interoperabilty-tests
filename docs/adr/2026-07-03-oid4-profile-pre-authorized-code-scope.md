# OID4 profile scope: pre-authorized-code issuance, no OID4VP authorization-code grant, testable-core verifier

- Status: accepted
- Date: 2026-07-03
- Context: Cleanup of the OID4 profile requirements across the test suite and the interoperability guide

## Context

The OID4 profile requirements (in `ler-interoperability-test-suite` as runnable checklists, and in
`strada-ler-interoperability-guide` as `profiles/oid4-ecdsa-profile.yaml` + `oid4-ecdsa.md`) had
accreted three problems: a generic, untestable `"Implement the OID4V(CI|VP) v1.0 specification."`
MUST in every workflow; authorization-code-flow requirements scattered across both OID4VCI **and**
OID4VP workflows; and an overcomplicated verifier checklist (~18 MUSTs including trust-registry
integration, threat mitigation, and caching). The issuer OID4VCI checklist is code-coupled: its
requirement `id`s drive the `oid4-issuer-flow.ts` check registry built in
`2026-07-02-issuer-oid4-test-wallet-flow` (whose ADR flagged this reconciliation as follow-up).

## Decision

1. **OID4VCI issuance standardizes on the pre-authorized-code flow.** The authorization-code grant
   is not part of the profile. The issuer checklist drops its authorization-code / authorization-
   endpoint requirements (and the perpetually-`n/a` "proper error handling" clause); the two
   near-duplicate pre-auth/token clauses collapse into a single `pre-authorized-code-flow`
   requirement, checked at the token endpoint. Issuer checklist: 21 → 16 requirements, and the check
   registry no longer emits any `n/a` outcomes on a clean run. Matches what the SBS transaction
   service actually implements.

2. **OID4VP presentation/verification has no OAuth authorization-code grant.** OID4VP uses an
   Authorization Request (`presentation_definition` / DCQL) and returns a `vp_token` (e.g. via
   `direct_post`); "support authorization-code flow" and "issue an authorization code" were simply
   wrong and are removed. The verifier's "Handle authorization request" step is replaced by receiving
   the presentation response; the verifier checklist merges to two steps (create request; receive +
   verify).

3. **The verifier profile is scoped to an interoperability-testable core.** Kept as MUST: presentation
   validation, credential extraction, VCDM2/OB3 schema + expiration, signature verification, DID
   resolution, Bitstring Status List verification + signature/freshness, TLS, graceful failure
   handling, and a `direct_post` response endpoint. Demoted to SHOULD: trust-registry integration,
   threat mitigation (replay / forgery / status-list manipulation), status caching, and
   status-service-unavailability handling. The generic "comprehensive validation error handling" MUST
   is dropped.

4. **No generic "implement the spec" requirement.** Every requirement is specific and testable
   (mirroring the VCALM profile).

5. **The two representations are kept congruent** (test suite ↔ guide), edited together. The guide
   retains its ECDSA/P-256 (`ecdsa-rdfc-2019`) framing while the test-suite base stays
   cryptosuite-agnostic (deferring to the `data-integrity-cryptosuites` additive) — that difference is
   deliberately **not** reconciled here (see Follow-ups).

## Consequences

- A clean OID4VCI issuer run reports all-pass with no `n/a` outcomes; the checklist reflects only what
  the pre-authorized-code happy path actually exercises.
- The OID4 profile can no longer describe an authorization-code-capable issuer/verifier. If an
  auth-code-capable flow is ever in scope, it returns as a deliberate, testable addition rather than an
  aspirational MUST.
- The verifier profile no longer asserts untestable/aspirational MUSTs; trust-registry and
  threat-mitigation guidance survives as SHOULD.
- Cross-repo: the guide and the test suite must be edited together for OID4 requirement changes;
  they are congruent as of this change (cryptosuite framing aside).

## Alternatives considered

- **Keep authorization-code flow as an optional `MAY`.** Rejected: the goal was a clean,
  not-overcomplicated OID4VCI-1.0 profile, and a `MAY` the suite never exercises is noise. Removed
  entirely; it can return as a tested capability if needed.
- **Leave the auth-code issuer clauses resolving `n/a`.** Rejected: perpetual-`n/a` MUSTs are exactly
  the overcomplication this cleanup removes.
- **Reconcile the additive/cryptosuite mismatch now.** Deferred: the additive-profile abstraction is
  not settled; forcing the guide to the dual-suite model here would be premature.

## Follow-ups

- Reconcile the "additive profiles" abstraction: the guide is ECDSA-only while the test-suite OID4 base
  defers cryptosuite specifics to the `data-integrity-cryptosuites` additive (eddsa-rdfc-2022 +
  ecdsa-rdfc-2019). Its own plan.
- Negative-probe / Authorization-Code-flow probes for the issuer flow remain future work
  (see `2026-07-02-issuer-oid4-test-wallet-flow`).

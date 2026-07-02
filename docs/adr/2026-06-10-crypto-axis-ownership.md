# Crypto-axis ownership: key-proof rules in base, cryptosuite options in additive

- Status: accepted
- Date: 2026-06-10
- Context: Crypto-options specificity (OID4 di_vp + base/additive refinement)

## Context

Profiles describe credential exchanges that have several distinct cryptographic
axes:

1. **Credential-signature cryptosuite** — how the issuer signs the VC
   (`eddsa-rdfc-2022` / `ecdsa-rdfc-2019`).
2. **Key proof of possession** — how the holder proves control of the key the
   credential binds to. This is **protocol-specific**: OID4VCI advertises it in
   `credential_configurations_supported[…].proof_types_supported` (e.g. `di_vp`
   vs `jwt`); VCALM/VC-API uses a DIDAuthentication verifiable presentation.
3. **Presentation proof format** — OID4VP `di_vp`/`ldp_vp` vs JWT VP.

A wallet that supported OID4VCI but only JWT key proofs (no `di_vp`) exposed that
the content model captured only axis 1 (in the `data-integrity-cryptosuites`
additive) and said nothing about axes 2–3. We needed to make the base profiles
specific about the key-proof axis without breaking the additive's reuse across
profiles.

## Decision

Split crypto concerns by ownership:

- **Protocol-specific key-proof and presentation rules live in the BASE
  profile.** They differ per protocol and must not be shared:
  - OID4 base: OID4VCI `proof_types_supported` MUST include `di_vp`; the di_vp
    key proof follows OID4VCI Appendix F.2 (`proofPurpose: authentication`,
    `domain` = Credential Issuer Identifier, `challenge` = `c_nonce`); OID4VP
    requests/sends Data-Integrity (`di_vp`/`ldp_vp`) presentations, not JWT VPs.
  - VCALM base: the DIDAuthentication VP is a Data Integrity proof
    (`proofPurpose: authentication`, `challenge` from the
    `verifiablePresentationRequest`).
- **Cryptosuite _options_ live in the shared `data-integrity-cryptosuites`
  additive.** The bundle's suites are exactly the di_vp
  `proof_signing_alg_values_supported`, and they secure BOTH the credential's own
  Data Integrity proof and the key-proof VP. The additive applies to multiple
  base profiles by (role, workflow), so it must stay protocol-agnostic.

Consequence for authoring: OID4VCI-specific rules (`proof_types_supported`,
`c_nonce`, `domain = issuer id`) go in `profiles/oid4/*` only — never in the
shared additive (which also matches vcalm) and never in `profiles/vcalm/*`
(different idiom).

## Alternatives considered

- **Put the di_vp/proof_types rules in the shared additive.** Rejected: the
  additive matches vcalm and oid4 by (role, workflow); OID4VCI-specific rules
  would incorrectly apply to vcalm, and the rules differ by protocol.
- **A structured `cryptoOptions` data model** (typed per-step axes, special
  rendering). Considered and deferred: the team chose prose requirement rows +
  `keyComponents` for now (lower cost; the axes are stable enough to express in
  prose). The ownership split here is what a future structured model would also
  follow.
- **Model JWT/alternative key proofs as an additive now.** Deferred: the
  transaction-service is di_vp-only, so a JWT bundle would be non-runnable; left
  to a future plan.

## Consequences

- The base profiles are the single home for protocol key-proof conformance; the
  additive is the single home for cryptosuite options. Future profile/additive
  edits must respect this split.
- Making the base explicit about `di_vp` is a content change only — the
  `dcc-transaction-service` already advertises/accepts `di_vp` only, so no
  service change was required.
- A future alternative-key-proof bundle (e.g. JWT) would be a new additive plus
  transaction-service support (per-exchange `proof_types_supported` + jwt proof
  handling) — a separate plan.

# Test wallet: crypto stack + server-side holder domain

- Status: accepted
- Date: 2026-06-10
- Context: Test wallet client (make issuer/exchange workflows runnable)

## Context

To exercise issuer/exchange workflows end-to-end and assert protocol/credential
conformance, the suite needs a **conformant holder** it can run itself — a "test
wallet" that completes VCALM exchanges and OID4VCI offers, signs the required
Data Integrity proofs, and verifies issued credentials. The suite had **no
crypto/DID stack** (only `@digitalcredentials/verifier-core`, server-side), so
this is net-new and forces several lasting choices: which crypto libraries, where
the wallet runs, what holder identity it uses, and how conformance is checked.

## Decision

1. **Crypto stack: the `@interop/*` VC libraries, with `@digitalbazaar/*`
   cryptosuites.** `@interop/vc` + `@interop/data-integrity-proof` +
   `@interop/security-document-loader` + `@interop/did-method-key` +
   `@interop/ecdsa-multikey`, paired with
   `@digitalbazaar/{ed25519-multikey, eddsa-rdfc-2022-cryptosuite,
ecdsa-rdfc-2019-cryptosuite}` for the pieces `@interop` does not publish
   (Bitstring Status List + did:web resolution are added with M5/M6 when wired). This
   mix is the pattern `@interop/vc` itself documents (its `DataIntegrityProof`
   consumes `@digitalbazaar` cryptosuites) and is the same lineage the updated
   dcc-verifier-core uses. The three untyped `@digitalbazaar` packages get a one
   ambient-declaration shim; all boundary casts are isolated to the
   `wallet-crypto` adapter.

2. **Server-side holder domain.** All holder crypto + protocol HTTP run in
   server-only domains (`src/lib/server/domain/wallet-crypto`, `…/wallet-client`,
   `…/wallet-runner`) behind `POST /api/wallet-runner/accept`. The browser stays a
   thin initiator. Signing keys never reach client code (mirrors `verifier-core`).

3. **Ephemeral per-exchange `did:key` holder.** A fresh keypair is generated per
   run — Ed25519 for `eddsa-rdfc-2022`, P-256 for `ecdsa-rdfc-2019`. There is no
   persistent wallet identity; the holder DID exists only to bind the exchange.

4. **Conformance checks reuse the issuer-runner model.** A `wallet-runner`
   `ExchangeChecker` walks the wallet checklist + applicable additive checklists
   and produces the same `CheckOutcome`/`IssuerRunnerReport` shapes the
   issuer-runner uses, keyed by profile requirement ids — so the existing
   `RequirementReport` UI renders wallet reports unchanged.

5. **Per-protocol drivers behind one seam.** A `ProtocolDriver` per protocol
   (VCALM via VC-API exchange continuation; OID4VCI via the pre-authorized-code
   flow producing a **`di_vp`** key proof bound to the `c_nonce`) is dispatched by
   the wallet client; conformance checking is shared.

## Consequences

- A new crypto dependency surface enters the repo; it is server-only and confined
  to `wallet-crypto`. The `@interop`/`@digitalbazaar` mix is intentional, not a
  workaround — proven by sign→verify round-trip tests for both cryptosuites.
- The suite ships a **conformance harness wallet**, not a production wallet: no
  credential store, no persistent identity, no key management UX (a credential
  store arrives only if/when OID4VP presentation — M5 — needs one).
- OID4VCI requires the issuer to advertise/accept `di_vp` key proofs; against a
  JWT-only issuer the driver stops and reports rather than producing a JWT proof.

## Alternatives Considered

- **All-`@digitalbazaar` or all-`@digitalcredentials`.** Coherent, but the team
  standardized on the `@interop` TS forks (verifier-core lineage); `@interop/vc`
  is the requested core.
- **A bundled wallet SDK** (Sphereon/Credo/Veramo). Heavier and a poorer fit for
  our exact cryptosuites + `di_vp` requirements than hand-wiring the flows.
- **Client-side wallet.** Rejected — signing must stay server-only and the libs
  are Node-oriented.
- **Persistent holder identity.** Unnecessary for a per-exchange conformance test.
- **A new conformance-check model.** Rejected — the issuer-runner shapes fit, and
  reuse keeps one report UI.

## Follow-ups

- M5 (OID4VP presentation) needs its own `sbs-plan` (presentation-exchange/DCQL
  matching + a credential store).
- M6 cleanup + a full `pnpm turbo validate` pass.
- Live end-to-end against the local `feature/oid4vp` dcc-transaction-service is
  user-driven (the fakes prove the flows in CI).

# Black-box wallet credential-presentation scoring (from an observed verify exchange)

- Status: accepted
- Date: 2026-07-11
- Context: wallet presentation P3 — scoring a REAL operator wallet's
  `credential-presentation` conformance from the verify exchange the suite
  observes as the verifier, rather than driving the suite's own test wallet

## Context

Two prior decisions frame how the suite grades a system under test:

- **`2026-07-03-normalized-wallet-run-response`** covers wallet flows where the
  suite drives its **own** test wallet and can read `ctx.holder`/`ctx.presentation`
  straight from what its wallet built.
- **`2026-07-04-verifier-assessment-model`** covers the participant's **verifier**,
  whose accept/reject decisions happen inside their system and are invisible, so
  the suite grades them with operator-**attested** passes.

The runnable wallet presentation puts the participant's **wallet** under test with
the suite playing the verifier. This breaks the assumption both ADRs lean on. The
verifier-assessment-model ADR states outright that "for issuer and wallet flows the
suite can observe the system under test directly" — true only while the suite drove
its own wallet. Here the wallet is external: the suite never holds the holder key,
never builds the VP, and only sees what the verify exchange exposes at
`variables.results.default` (the folded verifier-core `VerificationResult`: overall
`verified`, the echoed `verifiablePresentation`, per-check/per-credential results).

We still want a per-requirement conformance report. The open question is how to
score MUSTs the suite cannot observe from an exchange (explicit consent, a
presentation interface, TLS as a transport property) without either overstating
confidence or forcing the operator through an attestation conversation.

## Decision

**Score the wallet black-box from the observed exchange; do not drive the suite's
own wallet, and do not attest.** A verify-exchange → `WalletCheckCtx` adapter
(`wallet-runner/verify-exchange-context.ts`) derives the check context purely from
the echoed VP:

- `presentation` := `results.default.verifiablePresentation`
- `holder.did` := `vp.holder`; `holder.cryptosuite` := `vp.proof.cryptosuite`
- `credential` := `undefined` — there is no original operator VC to diff, so the
  `preserve-vc-proofs` check uses its presence-only branch (the honest signal for a
  real wallet; verbatim-identity is not assertable).
- `verify.verified` := `results.default.verified` (verifier-core's verdict).

The existing four `data-integrity-cryptosuites` presentation checks run unchanged
over this adapted ctx, and stable ids on the black-box-observable base MUSTs
(`di-vp-not-jwt`, `vp-signature-valid`, `proof-binding`, `vp-delivered`) get
check functions (`checks/base-presentation.ts`) that read the same observed data.

**Non-observable MUSTs are held `n/a`, not attested and not failed.** Consent-UI,
presentation-interface, empty-POST, and TLS rows carry no registered id, so the
`ExchangeChecker` fallback resolves them to `n/a`, and `verified` fails only on a
MUST `fail`. Unlike the verifier model, we deliberately do **not** ask the operator
to attest these rows: a wallet's crypto/structural conformance — exactly where
interop breaks — is fully recoverable from `results.default`, and that is the
high-signal surface worth lighting per-requirement. Forcing an attestation on
consent/TLS rows would manufacture confidence the exchange cannot support.

**Settle-gated scoring.** The score endpoint (`POST /api/wallet-runner/present-score`)
only grades once the exchange is authoritative (`state ∈ {complete, invalid}`). While
`pending`/`active` (including the two-phase `active`+`verifyTask` Open Badges window),
it returns `settled: false` so the page keeps polling — never a spurious failing
report from a half-settled exchange. Run-state derivation mirrors this: the
`active`+`verifyTask` window is a non-terminal `wallet-connected`, so `pollExchange`
does not tear down before the async pass finishes.

The report reuses the normalized `IssuerRunnerReport`/`WalletReport` shape
(`2026-07-03`), and the endpoint returns `{ settled, state, report?, failingMustCount? }`.

## Consequences

- The suite grades an external wallet without ever driving its own wallet or
  holding the operator's key; the graded surface is precisely what the verify
  exchange observed.
- The honesty boundary is explicit and different from the verifier model:
  observable crypto/structural MUSTs are scored; structurally non-observable MUSTs
  are `n/a` (visible, unresolved), not attested.
- `preserve-vc-proofs` degrades to presence-only for real operator VCs — the honest
  black-box signal, already handled by the existing check's `credential === undefined`
  branch.
- Scoring is pure and registry-injectable, so route tests exercise real scoring
  against P1's fake verify lifecycle (a self-verifying VP settled into
  `results.default`, plus an invalid case).
- Future protocol surfaces (OID4VP vs vcapi) need no new scoring model — the
  `VerificationResult` shape is identical across protocols; only the adapter's
  delivery/`domain` reads differ.

## Alternatives considered

- **Attest the non-observable wallet MUSTs** (reuse the verifier model's attested
  passes for consent/UI/TLS). Rejected for this flow: the crypto/structural MUSTs
  that matter for interop are directly observable from the exchange, so an
  attestation conversation adds operator burden for the low-signal rows and blurs
  the clean "observed vs not observed" line. `n/a` is the more honest resolution.
- **Run the suite's own test wallet to produce the ctx.** Rejected: it would grade
  the suite's wallet, not the operator's — the opposite of a conformance test for an
  external wallet.
- **Score before the exchange settles** (grade `active`/`pending`). Rejected: the
  two-phase Open Badges pass can flip `verified`, and OID4VP pre-verification
  failures leave the exchange `pending`; grading early yields spurious fails.

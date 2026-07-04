# Verifier assessment model (layered floor + attested acceptance passes)

- Status: accepted
- Date: 2026-07-04
- Context: verifier M1 — the first runnable verifier checklist
  (`ob3-direct-delivery` × `direct-credential-verification`), where the
  system under test is the participant's verifier and the suite plays
  the wallet handing credentials over

## Context

For issuer and wallet flows the suite can observe the system under test
directly: it receives the credential, drives the protocol, and grades
what it saw. A verifier is different — the interesting behavior (accept
or reject a credential, and why) happens inside the participant's
system, invisible to the suite in a direct-delivery flow where
credentials arrive as pasted JSON with no protocol round trip.

We still want a runnable verifier checklist with per-requirement
outcomes, and we want it to be honest about what the suite actually
observed versus what the operator told us. We also need test
credentials whose defects a real verifier can genuinely detect — a
"broken signature" fixture whose signature actually fails verification,
not a prose label.

## Decision

**Layered verifier assessment.** One checklist carries two layers as
distinct requirement rows:

- an **automated observable floor** — protocol/request checks the suite
  can verify itself (these arrive with the OID4VP and VCALM exchange
  flows in roadmap M2/M3; the direct-delivery flow has no protocol
  surface to check), and
- **operator-attested acceptance passes** — rows scored from the
  operator's report of what their verifier decided.

Every scored outcome carries `source: 'automated' | 'attested'`
(`VerifierCheckOutcome` in `src/lib/interop/verifier-run/`), and the UI
renders an ATTESTED pill on attested rows so a reader can always tell
which results the suite observed and which the operator vouched for.

**Attested acceptance passes.** A run contains one pass per kind —
`valid`, `broken-signature`, `schema-problem`, `expired` — shuffled
(Fisher–Yates over `node:crypto` randomness) and opaquely labeled
"Credential 1"…"Credential 4" so the order betrays nothing. User-facing
copy deliberately avoids the word "passes". For each credential the
test wallet asks for a verdict via a radio set (accepted / rejected)
plus an optional rejection reason; the actions are "Start verifying" /
"Start over". Scoring (`score-run.ts`):

- valid-accepted and each defect-rejected are **MUST** rows —
  `pass`/`fail` on the verdict alone;
- a rejection with the **wrong reason** resolves `warn` (rejection
  stands; the reason is a diagnostic, and `other`/no reason is not
  second-guessed).

**Cryptographically honest fixtures** (`passes/build-pass.ts`): defects
are signed-in or window-only, never fake. The schema defect is
introduced before signing, so the data-integrity proof verifies over
the defective document; the expired credential is signed with a
validity window entirely in the past, so the proof verifies but any
clock-aware verifier must reject it (`wallet-crypto.verifyCredential`
gained an optional `{ now }` clock override so the fixture sanity tests
can prove it verifies inside its window); only `broken-signature` is
tampered after signing, so its proof genuinely fails.

**Stateless ground truth + cooperative trust model.** The flow is
generate → client holds the run → score: the generate endpoint returns
the full `VerifierRunDefinition` — ground-truth `kind` included — the
operator's browser holds it (the UI hides `kind` until the post-scoring
reveal), and the score endpoint receives it back with the attestations.
The server keeps no state and re-validates coherence (every kind
exactly once, one attestation per pass). There is no sealing or
signing of the run, deliberately: the pass artifacts are inherently
inspectable (an operator can verify the signatures themselves), and the
suite is cooperative self-certification. Randomized opaque labels
prevent pattern-matching, not adversaries — an operator determined to
cheat is only cheating their own conformance report.

**Acceptance step embedded in the core verifier profile**, not an
additive profile. Deciding correctly about valid and defective
credentials is core verifier conformance for the protocol profile; the
"Demonstrate verification outcomes" step lives in the
`ob3-direct-delivery` verifier checklist with row ids
`ob3-direct-delivery.verifier-accepts-valid-credential`,
`…verifier-rejects-broken-signature`, `…verifier-rejects-schema-problem`,
`…verifier-rejects-expired`, `…verifier-rejects-revoked`. M2/M3
replicate the step for the oid4/vcalm verifier checklists.

**Wallet-as-interlocutor UX.** The acceptance conversation — handing
credentials over, asking for verdicts, echoing them neutrally, and the
reveal — lives in the test-wallet panel, reusing the normalized
wallet-run-response vocabulary (`WalletActivity`/`WalletArtifact`; the
report returns both, so the panel consumes it directly). The base
TestWallet grew three extensions to host it: an optional initiation
input (no `inputLabel` → no input row, for flows the wallet starts
itself), a `prompt` snippet (the wallet "asking" the operator
something), and an `artifactsExtra` snippet (richer artifact cards —
the pass credentials with copy/download). Pre-reveal, nothing rendered
may mention a pass kind; verdict echoes are deliberately neutral
(`info`).

**Revocation deferral.** The `verifier-rejects-revoked` MUST row exists
in checklist content today but has no pass; the scorer resolves it
`n/a` with the message "Revocation checks are not yet available in this
suite — status-list support is planned." and the UI renders it with the
skipped tone. `'revoked'` joins `PassKind` when status-list support
lands (a larger, separately planned effort).

## Consequences

- The suite never overstates what it observed: attested rows are
  visibly attested, in both the data (`source`) and the UI (pill).
- No database, no session state: the verifier-runner stays as stateless
  as the rest of the suite, and a run survives page reloads only as
  long as the client keeps it — acceptable for a self-help tool.
- Fixture honesty means results transfer: a verifier that rejects the
  broken-signature pass did real signature verification, not label
  matching.
- The scoring engine is pure and shared by Real and Fake wirings, so
  route tests exercise real scoring with deterministic fixtures.
- M2/M3 add automated floor rows and replicate the acceptance step per
  protocol profile without changing the assessment model.
- The revoked row sits visibly unresolved on every report until
  status-list support lands — a standing reminder, by design.

## Alternatives considered

- **Server-held run state.** Rejected: requires a DB or session store
  the suite otherwise doesn't need, complicates deploys, and buys
  nothing — the client must see the credentials anyway.
- **Sealed/signed run tokens** (ground truth encrypted or signed so the
  client can't read it). Rejected: complexity without honesty — the
  pass artifacts are inspectable JSON, so a motivated operator can
  always recover the ground truth by verifying signatures themselves.
  The trust model is cooperative; sealing pretends otherwise.
- **Machine verdict callback API** (the participant's verifier POSTs
  its decisions to the suite). Rejected for M1: real participant
  burden (build an integration to run a checklist) for marginal trust
  gain. Plausible future work alongside M2/M3.
- **An "acceptance testing" additive profile.** Rejected: verdict
  behavior is core conformance for each protocol profile, not an
  optional capability axis; embedding the step in the core checklist
  keeps one checklist per (role, workflow, profile) combination.

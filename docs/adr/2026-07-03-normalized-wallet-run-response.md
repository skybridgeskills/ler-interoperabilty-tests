# Normalized wallet run-response model (`walletActivity` + `artifacts`)

- Status: accepted
- Date: 2026-07-03
- Context: TestWallet component refactor (P1) — a wallet-like UX needs a
  consistent, story-shaped view of what the test wallet did across three
  structurally different issuer flows

## Context

The suite drives a built-in "test wallet" through three issuer flows and
returns a per-requirement conformance report:

- **VCALM** (`POST /api/wallet-runner/issuer-vcalm/run`) — the driver records
  `IssuerFlowObservations` (`interaction`, `didAuth`, `delivery`, `verify`),
  filled progressively. There is **no ordered transcript**.
- **OID4VCI** (`POST /api/wallet-runner/issuer-oid4/run`) — the driver records
  `Oid4IssuerFlowObservations`, including an ordered, protocol-shaped
  `transcript: Oid4StepObservation[]` (offer, issuer/AS metadata, token, nonce,
  credential) with the access token redacted upstream.
- **Direct issuance** (`POST /api/issuer-runner/verify`) — paste-and-verify;
  the suite is the verifier. It returns an `IssuerRunnerReport`
  (`groups[].outcomes[]`), with no protocol interaction at all.

The upcoming UI wants an ordered "here is what the wallet did" activity list
with pass/fail/warn iconography, plus a high-level summary of any produced
artifact (today: a received/pasted credential). Deriving that on the client
would mean teaching the browser three different observation shapes and the
protocol semantics behind them, and would drift as flows evolve. The three
flows' observation shapes are asymmetric (transcript vs no transcript vs a
report), so a shared client vocabulary is needed.

## Decision

Introduce a **normalized, client-safe run-response model** and return it,
additively, from all three run/verify endpoints:

- `WalletActivity[]` — an ordered list of what the wallet did. Each entry is an
  `interaction` (with the system under test) or a `check` (a verification test
  the wallet ran), carrying a `label`, a shared `WalletActivityStatus`
  (`ok` / `fail` / `warn` / `info` / `skipped`), an optional `detail`, and an
  optional 0-based `stepIndex` that cross-links to the left-column checklist
  step for highlighting. Detailed per-requirement results stay in the runnable
  checklist — activity is the story, not the graded contract.
- `WalletArtifact[]` — a display-oriented summary of each produced artifact
  (`kind: 'credential'` with `title`, `issuer`, `issuanceDate`, `verified`,
  `types`), not the full credential.

The schemas are `ZodFactory` types in `src/lib/interop/wallet-activity.ts`
(client-safe — no server-only imports, mirroring `runner-state.ts`), so
components and stories can consume them directly.

A **shared server mapper** (`wallet-runner/wallet-activity-map.ts`) owns all
protocol knowledge and produces the model from each flow's observations:

- `vcalmActivity(obs, run)` — fetch-interaction, request-DIDAuth,
  authenticate-and-receive (interactions), then a verify-proof check.
- `oid4Activity(obs, run)` — drives the interaction entries off the ordered
  `transcript`, then appends the verify-proof check.
- `directDeliveryActivity(report)` — a light three-entry list (loaded / ran
  verifier-core / ran conformance checks) derived from the report.
- `credentialArtifact(credential, verify?)` — shared across all three;
  `verified` comes from the flow's `VerifyResult` (or `{ verified }` derived
  from the direct-issuance report).

**Non-run steps are omitted, not emitted as `skipped`.** Because observations
are filled progressively, absence of an observation is exactly "did not run",
matching the pending convention the runnable checklist already uses.
(`skipped` remains in the status vocabulary for a future explicit use.)

**Additive response contract.** The two fields are added alongside the existing
endpoint payloads; no field is removed or renamed. The OID4 access-token
redaction upstream is preserved — secrets never reach `detail`.

## Consequences

- One status vocabulary spans VCALM, OID4, and direct issuance despite their
  different observation shapes; the UI consumes a single model.
- The server owns protocol knowledge; the client stays protocol-agnostic and
  the mappers are pure and unit-tested (happy path, blocking failure mid-flow,
  unverified credential).
- The response contract is additive, so existing consumers (run-history, report
  rendering, the current panel) are unaffected.
- Future wallet flows (e.g. verifier-side presentation) adopt the same model by
  adding a mapper for their observations — no new client vocabulary.
- The `stepIndex` cross-link is best-effort and optional; it is derived from the
  base checklist step order and is not part of the graded contract.

## Alternatives considered

- **Client-side derivation.** Rejected: pushes three protocol shapes and their
  semantics into the browser, duplicates knowledge already on the server, and
  drifts as drivers change. The server already holds the observations.
- **Expose only OID4's transcript (VCALM as-is).** Rejected: leaves VCALM
  without an ordered story and forces the UI to special-case each flow — the
  opposite of the normalization goal.
- **Return the full credential as the artifact.** Rejected: the UI needs a
  compact display summary, and shipping the whole credential invites leaking
  fields the card does not render; `credentialArtifact` extracts exactly the
  display fields.

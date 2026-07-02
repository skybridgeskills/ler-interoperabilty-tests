# Issuer VCALM test-wallet flow: stateless run-to-completion over a user-supplied URL

- Status: accepted
- Date: 2026-07-01
- Context: Use the test wallet to test issuers (starting with VCALM credential issuance)

## Context

The test wallet (see `2026-06-10-test-wallet-crypto-and-holder-domain`) was reachable only from
the wallet-acceptance pages, where the suite owns the exchange (it creates one against its own
transaction-service and the wallet accepts it). To help an **issuer** build their system, the
wallet must instead act as the holder against an exchange that lives on the **issuer's** system:
the developer creates a VCALM exchange, exposes an interaction URL, pastes it into the suite, and
the wallet participates and reports per-requirement conformance inline on the issuer checklist.

This forces several lasting choices: how the wallet drives an exchange it does not own, how much
run state the server keeps between the client's interactions, how user-supplied URLs are fetched,
and how automated results map onto individual checklist requirements.

## Decision

1. **Stateless, run-to-completion execution.** A single `POST
/api/wallet-runner/issuer-vcalm/run` drives the entire holder flow (fetch interaction URL →
   request DIDAuthentication → sign + submit holder VP → receive + verify credential) in one
   request and returns the full result. The flow **stops at the first blocking failure**
   (`blocked` + `stoppedAtStep`); requirements past that point are reported as _pending_, not
   failed. No server-side session store, no `keyv`, no `AppContext` state — the driver threads a
   plain in-memory observations accumulator.

2. **Tokenless user-URL transport, separate from the exchange-runner client.** A new
   `IssuerFlowTransport` fetches the absolute interaction URL the user pasted and POSTs to the
   discovered absolute `vcapi` URL with **no Authorization header** — distinct from the
   transaction-service client (which uses `TRANSACTION_SERVICE_URL` + a tenant token). A
   `node:tls` probe reads the negotiated protocol to check TLS ≥ 1.2 explicitly.

3. **Accepted SSRF trade-off.** Both the TLS probe and the fetch/POST reach a user-supplied host.
   This is an SSRF surface. It is accepted un-allowlisted because this is a local developer
   testing tool (the same server already reaches the local transaction-service), and the whole
   point is to reach the developer's own endpoint. It is documented at the transport boundary.

4. **Requirement-id → check registry, decoupled from the driver.** The driver only _observes_;
   a `wallet-runner` `runIssuerFlowChecks` maps observations to the base issuer VCALM checklist by
   the `vcalm.issuer.credential-issuance.*` requirement ids and produces the same
   `CheckOutcome`/`IssuerRunnerReport` shapes the issuer-runner uses. Step-4 credential checks
   **reuse the OB 3.0 issuer check logic**; `verified` uses the same `MUST`-not-`fail` rule as the
   existing check-runner.

5. **Requirements reframed for honesty.** Two clauses the wallet cannot verify on the happy path
   are reframed rather than faked: the QR/copyable exposure becomes "the pasted interaction URL is
   fetchable" (the affordances are self-attested), and the two ProblemDetails error-handling
   clauses resolve `n/a` (they need a negative probe, out of scope).

6. **Runnable page overrides the dynamic route.** `/issuer/credential-issuance/vcalm` is a
   dedicated non-prerendered route (mirroring the wallet-acceptance override); the dynamic
   `[workflow]/[profile]` route excludes that combo from its prerender `entries()`.

## Consequences

- One request per run; the server keeps nothing between runs. Simpler and leaner than a stepwise
  design, at the cost of no manual mid-flow pause — covered by the "stop at first blocking
  failure" behavior and a re-run affordance.
- The suite can now reach arbitrary user-supplied hosts from the server (accepted SSRF). If this
  tool were ever hardened for multi-tenant/hosted use, an allowlist or egress proxy would be
  needed — called out here so that decision is deliberate.
- Per-requirement lighting (pass/fail/warn/pending) with inline errors and collapsible raw bodies
  requires the driver to surface raw step bodies; the report stays in the existing outcome shape.
- Only the **base** issuer VCALM checklist is wired; additive DI-cryptosuites issuer checks stay
  in the pasted-credential issuer runner.

## Alternatives Considered

- **Stepwise execution with an ephemeral session store (`keyv`).** Originally planned (option A);
  it let the user advance one step at a time but needed a new stateful server dependency and
  `AppContext` wiring. Dropped once the requirement relaxed to "run until failure or complete" —
  the store bought nothing the single run doesn't.
- **Reusing the exchange-runner transaction-service client.** Wrong seam: that client targets the
  suite's own service with a tenant token; here the exchange is on the user's host and unauthed.
- **Allowlisting / proxying user URLs.** Rejected for a local dev tool; would add friction with no
  security benefit in the single-developer context.
- **Extending the `WalletClient`/`FakeWalletClient` interface with `runIssuerFlow`.** Rejected in
  favor of a dedicated `vcalmIssuerFlow` provided service, so the route can inject a fake flow and
  the acceptance client stays untouched.

## Follow-ups

- Extend to OID4VCI issuer + verifier flows (verifier presentation) with the same pattern.
- Live end-to-end against a real issuer is user-driven; the fakes + real-crypto-over-fake-transport
  tests prove the flow in CI.

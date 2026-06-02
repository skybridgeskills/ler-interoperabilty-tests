# 2026-05-09 — Exchange Runner: Summary

## What shipped

A live exchange runner: a developer points a real wallet at the suite,
clicks an in-page CTA, and watches a real VC-API exchange progress on a
side-by-side run-state column.

### Local dependency services

- `docker/compose.dev.yml` orchestrates `dcc-transaction-service` (4004)
  and `dcc-signing-service` (4006) at user-pinned digests, file-backed
  Keyv volume under `docker/.data/`.
- `docker/README.md` runbook (first-time setup, day-to-day commands,
  reset, mobile / cross-device tunnel).
- `package.json` adds `dev:services`, `dev:services:down`, and
  `dev:full` scripts.
- `turbo.jsonc` adds a `dev:services` persistent task; `pnpm turbo
dev:full` runs SvelteKit dev + Storybook + services in parallel.
- `.env.example` documents every key the suite + containers consume.
  `.gitignore` excludes `.data/`.

### `live` color palette

- New semantic tokens in `src/routes/layout.css` (`--live`,
  `--live-foreground`, `--live-soft`, `--live-border`) for both light
  and dark modes — warm orange/flame contrasted against the cool Tokyo
  Night base.
- Surfaced via `@theme inline` (`bg-live`, `text-live`,
  `text-live-foreground`, `bg-live-soft`, `border-live`).
- New `Theme/Palette` storybook story exercises every token in context.
- `docs/design-system.md` updated with the `live` rows + a guidance
  block on when to reach for it.

### Server domain (`src/lib/server/domain/exchange-runner/`)

- `exchange-runner-config.ts` parses `.env` keys into a typed
  `ExchangeRunnerConfig` (ZodFactory, with sensible defaults).
- `transaction-service-client.ts` defines the
  `TransactionServiceClient` interface (`createExchange`,
  `getExchange`) and the **real** HTTP implementation talking to the
  Docker-hosted transaction service. Plus the `TransactionServiceError`
  class for typed failures and zod schemas for `ExchangeProtocols` /
  `ExchangeRecord`.
- `fake-transaction-service-client.ts` ships an **in-memory VCALM/VC-API
  fake** with the same response shape plus test-only mutators
  (`advanceToActive`, `advanceToComplete`, `advanceToInvalid`,
  `getStored`, `listExchanges`, `clear`). Wired by `TestAppContext`.
  Co-located tests cover schema parity, error shapes, and clone
  semantics.
- `provide-transaction-service-client.ts` wires both implementations
  via the existing provider chain. `DevAppContext` gets the real
  client; `TestAppContext` gets the fake. `appContext()` exposes
  `transactionServiceClient` and `exchangeRunnerConfig`.
- `ob3-credential-template.ts` bundles a sample Open Badges 3
  credential template the runner sends with each `createExchange`.

### Browser-side helpers (`src/lib/client/exchange-runner/`)

- `poll-exchange.ts` — `pollExchange(exchangeId, callbacks, options)`
  polls every 2s (configurable) for up to 5 minutes (configurable),
  stops on completion / error / abort. Tested with `vi.useFakeTimers()`.
- `render-qr.ts` — `renderQrSvg(text, size)` dynamically imports the
  `qrcode` lib and returns SVG markup so the QR generator stays out of
  the initial bundle.

### Server endpoints

- `POST /api/exchange-runner/create` — generates a UUID retrievalId,
  calls `transactionServiceClient.createExchange`, returns
  `{ exchangeId, protocols }`. Returns 503 with hint when the runner is
  disabled, 502 with hint when the service is unreachable.
- `GET /api/exchange-runner/[exchangeId]?stepCount=N` — calls
  `getExchange`, runs `deriveRunStateFromExchange` against the response,
  returns `{ exchange, derived }`.

### UI components

- `src/lib/interop/runner-state.ts` — pure derivation. Maps
  `ExchangeRecord.state` + key variables → `(ChecklistRunState,
StepRunState[])`. Full unit-test coverage.
- `src/lib/components/interop/exchange-runner/`
  - `step-run-state-indicator/` — pending / in-flight / complete /
    skipped chip, with the `live` pulse for in-flight.
  - `interaction-qr-card/` — QR + read-only URL input + copy button.
  - `exchange-runner-panel/` — right-column orchestrator wrapping all
    five run states (idle, awaiting-wallet, wallet-connected, complete,
    error) plus reset.
  - Each ships a story; `RunnableChecklist`'s parent story shows all
    four canonical states.
- `src/lib/components/interop/runnable-checklist/RunnableChecklist.svelte`
  — split-grid layout: the left column reuses the static checklist
  step + requirement rendering, the right column renders the supplied
  `rightColumn` snippet plus optional per-step state. Steps on the
  left show inline `StepRunStateIndicator` chips so the run state is
  legible whether the right column is visible or not.

### Wallet × VCALM-EdDSA integration

- `src/lib/pages/runnable-wallet-acceptance/RunnableWalletAcceptancePage.svelte`
  — owns the run state. CTA → `POST /api/.../create` →
  `pollExchange`. Reset / retry hooks. `onDestroy` cleans up the
  poller.
- `src/routes/wallet/credential-acceptance/vcalm-eddsa/+page.{svelte,ts}`
  — non-prerendered route shadowing the dynamic `[workflow]/[profile]`
  route for that single combination. The dynamic route's `entries()`
  excludes the combo to avoid prerender duplication.

### AppContext + tests

- `AppContext` gains `transactionServiceClient` and
  `exchangeRunnerConfig` slices.
- `DevAppContext` and `TestAppContext` updated.
- 120 tests across server / client / storybook projects pass; build
  prerenders 12 routes (9 checklist + 3 profile) and leaves the
  runnable wallet-acceptance × VCALM-EdDSA route as runtime-only.

## Validation

`pnpm turbo validate` passes (prettier, eslint, typescript, svelte,
vitest, build).

Live integration was smoke-tested during phase 1: both Docker images
pull, the compose file boots both services, `/healthz` returns 200, and
`POST /workflows/didAuth/exchanges` returns the expected protocols
object — confirming the auth scheme + routes used by the real client.

## Out of scope (future)

- Other 9 routes adopting `RunnableChecklist`.
- Verifier-side / issuer-side runners (presentation request, direct
  upload, etc.).
- Persisted run state (URL query, localStorage, account-scoped).
- Mobile / cross-device tunneling scripts (the env knob is documented
  but not automated).
- A "use my own credential template" flow (replace the bundled VC).
- Production deploy of the dependency services.

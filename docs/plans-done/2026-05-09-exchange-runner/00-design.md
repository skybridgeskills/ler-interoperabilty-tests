# 2026-05-09 — Exchange Runner: Design

## Scope of work

Make the suite something a developer can point a real wallet at. Three
pieces, one plan, six phases:

1. **Local dependency services** — `docker compose` orchestrating
   `skybridgeskills/dcc-transaction-service` and
   `skybridgeskills/dcc-signing-service` at pinned digests, optionally
   started by a turbo `dev:full` task alongside SvelteKit dev + Storybook.
2. **Live-state design language** — new semantic Tailwind token `live`
   (warm orange/flame in light + dark) reserved for run-state UI;
   instructional / catalog content keeps the existing cool palette.
3. **Runnable checklist** — a new `RunnableChecklist` component, a
   server-side `TransactionServiceClient`, server endpoints the page
   calls, and the wallet-acceptance × VCALM-EdDSA route wired to use
   them. CTA initiates an issuance exchange, displays the interaction URL
   as QR + copy-paste link, polls every 2s, and shows step-level run state
   on the right column.

Out of scope:

- Other 9 routes adopting the runnable layout.
- Verifier-side / issuer-side runners.
- Persistence of run state across page refreshes.
- Mobile-wallet tunneling guides (an env knob is documented but not
  scripted).
- CI / production deployment of the dependency services.

## File structure

```
ler-interoperability-test-suite/
├── docker/
│   ├── compose.dev.yml                                   # NEW
│   └── README.md                                         # NEW: runbook
├── docs/plans/2026-05-09-exchange-runner/
│   ├── 00-notes.md                                       # done
│   ├── 00-design.md                                      # this file
│   ├── 01-services-and-turbo.md                          # NEW
│   ├── 02-live-color-palette.md                          # NEW
│   ├── 03-transaction-service-client.md                  # NEW
│   ├── 04-runnable-checklist-component.md                # NEW
│   ├── 05-wallet-acceptance-vcalm-integration.md         # NEW
│   └── 06-cleanup-and-validation.md                      # NEW
├── .env.example                                          # UPDATE: add exchange-runner vars
├── package.json                                          # UPDATE: dev:services / dev:full / qrcode dep
├── turbo.jsonc                                           # UPDATE: dev:services + dev:full tasks
├── src/
│   ├── app.d.ts                                          # UPDATE: add new context types
│   ├── lib/
│   │   ├── components/
│   │   │   ├── interop/
│   │   │   │   ├── runnable-checklist/                   # NEW
│   │   │   │   │   ├── RunnableChecklist.svelte
│   │   │   │   │   ├── RunnableChecklist.stories.svelte  # 4 stories
│   │   │   │   │   ├── runnable-checklist-types.ts       # ChecklistRunState etc.
│   │   │   │   │   └── index.ts
│   │   │   │   └── exchange-runner/                      # NEW
│   │   │   │       ├── ExchangeRunnerPanel.svelte        # right-column orchestrator
│   │   │   │       ├── ExchangeRunnerPanel.stories.svelte
│   │   │   │       ├── InteractionQrCard.svelte          # QR + copy URL
│   │   │   │       ├── InteractionQrCard.stories.svelte
│   │   │   │       ├── StepRunStateIndicator.svelte      # per-step state chip
│   │   │   │       ├── StepRunStateIndicator.stories.svelte
│   │   │   │       └── index.ts
│   │   │   └── ui/                                       # may pull in shadcn `Skeleton`
│   │   ├── pages/
│   │   │   ├── runnable-wallet-acceptance/               # NEW
│   │   │   │   ├── RunnableWalletAcceptancePage.svelte
│   │   │   │   ├── RunnableWalletAcceptancePage.stories.svelte
│   │   │   │   └── index.ts
│   │   │   └── …                                         # existing
│   │   ├── interop/
│   │   │   ├── runner-state.ts                           # NEW: ChecklistRunState ZodFactory + step-derivation
│   │   │   └── …                                         # existing
│   │   ├── server/
│   │   │   ├── domain/
│   │   │   │   └── exchange-runner/                      # NEW
│   │   │   │       ├── transaction-service-client.ts     # interface + Real (HTTP) impl + zod
│   │   │   │       ├── transaction-service-client.test.ts
│   │   │   │       ├── fake-transaction-service-client.ts   # in-memory VCALM/VC-API fake
│   │   │   │       ├── fake-transaction-service-client.test.ts
│   │   │   │       ├── exchange-runner-config.ts         # env parsing
│   │   │   │       ├── exchange-runner-config.test.ts
│   │   │   │       ├── ob3-credential-template.ts        # bundled VC template
│   │   │   │       └── index.ts
│   │   │   ├── app-context.ts                            # UPDATE: add exchange-runner ctx
│   │   │   ├── app-env.ts                                # UPDATE: add new env keys
│   │   │   ├── build-app-context.ts                      # UPDATE
│   │   │   ├── dev-app-context.ts                        # UPDATE
│   │   │   └── test-app-context.ts                       # UPDATE: stub client
│   │   └── client/
│   │       └── exchange-runner/                          # NEW: browser-side polling helper
│   │           ├── poll-exchange.ts
│   │           ├── poll-exchange.test.ts
│   │           ├── render-qr.ts                          # dynamic-import qrcode wrapper
│   │           └── index.ts
│   └── routes/
│       ├── api/
│       │   └── exchange-runner/
│       │       ├── create/+server.ts                     # POST: create exchange
│       │       └── [exchangeId]/+server.ts               # GET: poll exchange
│       └── wallet/
│           └── credential-acceptance/
│               └── vcalm-eddsa/
│                   ├── +page.ts                          # NEW: prerender false; reuse static loader
│                   └── +page.svelte                      # NEW: renders RunnableWalletAcceptancePage
└── src/routes/layout.css                                  # UPDATE: add `--live*` tokens
```

Notes on the layout choice:

- Per-role dynamic checklist routes (`/issuer/[workflow]/[profile]`, etc.)
  are kept as-is and continue to render `WorkflowChecklist`. We carve out
  one specific route (`/wallet/credential-acceptance/vcalm-eddsa`) by
  shadowing it with a dedicated subdirectory + non-prerendered page that
  uses `RunnableChecklist`. SvelteKit's specific route wins over the
  dynamic one.
- A dedicated `RunnableWalletAcceptancePage` lives in
  `src/lib/pages/runnable-wallet-acceptance/` so we get a single component
  Storybook can also render. The route file is a thin shim.
- The transaction-service client lives under `src/lib/server/domain/`
  (server-only — never imported from client code) per the existing pattern.

## Conceptual architecture

```
┌─ Browser (the developer's tab) ────────────────────────────────────┐
│  /wallet/credential-acceptance/vcalm-eddsa                          │
│      RunnableWalletAcceptancePage                                   │
│        └─ RunnableChecklist                                         │
│             ├─ left:  static checklist (re-uses interop content)    │
│             └─ right: ExchangeRunnerPanel                           │
│                        ├─ CTA "Initiate exchange"                   │
│                        ├─ InteractionQrCard (QR + copy URL)         │
│                        ├─ StepRunStateIndicator × N                 │
│                        └─ pollExchange(exchangeId)                  │
└─────────────────────────────────────────────────────────────────────┘
        │ POST /api/exchange-runner/create        │ GET /api/.../{xid}
        ▼                                          ▼
┌─ SvelteKit server (adapter-node) ──────────────────────────────────┐
│  /api/exchange-runner/create  +server.ts                           │
│      reads provider context  →  TransactionServiceClient           │
│      builds VC template, calls POST /workflows/claim/exchanges      │
│      returns { exchangeId, interactionUrl, vcRequestUrl, expires }  │
│                                                                     │
│  /api/exchange-runner/[exchangeId]  +server.ts                     │
│      reads provider context  →  TransactionServiceClient           │
│      calls GET /workflows/claim/exchanges/{id}                      │
│      returns { state, derived: ChecklistRunState }                  │
└─────────────────────────────────────────────────────────────────────┘
        │  Authorization: Bearer ${TENANT_TOKEN_DEFAULT}
        ▼
┌─ Docker compose network ───────────────────────────────────────────┐
│  dcc-transaction-service (4004)  ──→  dcc-signing-service (4006)   │
│  with PERSIST_TO_FILE volume + DEFAULT_EXCHANGE_HOST                │
└─────────────────────────────────────────────────────────────────────┘
```

### Provider DI — Real and Fake parallel implementations

Two factory functions implementing the same `TransactionServiceClient`
interface:

- **`RealTransactionServiceClient(config)`** — HTTP client against the
  Docker-hosted transaction service. Wired by `dev-app-context.ts`.
- **`FakeTransactionServiceClient()`** — in-memory VCALM/VC-API style
  fake. Stores exchanges in a `Map`; exposes test-only mutators
  (`advanceToActive`, `advanceToComplete`, `advanceToInvalid`) so tests
  drive lifecycle transitions without HTTP. Wired by
  `test-app-context.ts`. The fake's response shape matches the real
  service exactly so `deriveRunStateFromExchange` is identical.

The provider exposes the same `transactionServiceClient` slice in both
modes. Server endpoints (`src/routes/api/exchange-runner/...`) read via
`providerCtx<…Ctx>()` and don't know which variant they're talking to.
Storybook stories that show "live" states reuse the fake to drive
realistic state transitions without hitting Docker.

### Run-state derivation

`runner-state.ts` exposes:

```ts
export const ChecklistRunState = ZodFactory(
	z.enum(['idle', 'awaiting-wallet', 'wallet-connected', 'complete', 'error'])
);
export const StepRunState = ZodFactory(z.enum(['pending', 'in-flight', 'complete', 'skipped']));

export function deriveRunStateFromExchange(exchange: TransactionServiceExchange): {
	run: ChecklistRunState;
	perStep: StepRunState[];
};
```

The mapping from VC-API exchange state + `variables.*` flags to
per-step states is a pure function with unit tests.

### Polling

`pollExchange(exchangeId, { onUpdate, onError, onTimeout })`:

- 2-second `setInterval` against `/api/exchange-runner/[exchangeId]`.
- 5-minute total timeout → `onTimeout()`.
- Stops on `state === 'complete'` or `state === 'invalid'`.
- AbortController cleanup on unmount.

## Style conventions

Drawn from `docs/style/README.md`, `philosophy.md`, `naming.md`,
`factory-functions.md`, `providers.md`, `schemas.md`,
`file-organization.md`, `documentation.md`, and `AGENTS.md`. Apply to
every phase of this plan.

- **Factory functions, not classes.** `TransactionServiceClient(config)`
  returns a plain object with methods like `createExchange`,
  `getExchange`. `export type TransactionServiceClient = ReturnType<typeof
TransactionServiceClient>`.
- **`ZodFactory`** for every payload shape we care about — request body,
  response body, derived run-state. Always export both the factory and
  the `type Foo = ReturnType<typeof Foo>` alias.
- **Providers for DI.** `provideTransactionServiceClient` /
  `provideExchangeRunnerConfig` slot into the chain in
  `build-app-context.ts`. The fake variant short-circuits to a stub
  exchange object so tests don't need Docker.
- **Server-only code under `src/lib/server/domain/exchange-runner/`.**
  Never imported from `+page.svelte` or browser code. Suite-side
  `+server.ts` endpoints proxy.
- **Browser-side helpers under `src/lib/client/exchange-runner/`** to
  signal the boundary clearly.
- **File size ≤ ~200 lines.** Split: client + types + config + template.
- **Order by abstraction.** Public exports first; helpers + types last.
- **Naming.**
  - Files: `kebab-case.ts`. Co-located tests: `<file>.test.ts`.
  - Svelte components: `PascalCase.svelte`.
  - Actions: camelCase verbs (`createExchange`, `pollExchange`,
    `deriveRunStateFromExchange`).
  - Types: `PascalCase`.
  - Context types: `XxxCtx`.
  - Env vars: `SCREAMING_SNAKE_CASE`. New keys:
    `EXCHANGE_RUNNER_ENABLED` (default `false`),
    `TRANSACTION_SERVICE_URL` (default `http://localhost:4004`),
    `TRANSACTION_SERVICE_TENANT_TOKEN` (no default — required when
    enabled).
- **Imports.** Three groups separated by blank lines (external →
  `$lib/` → relative).
- **No emojis** in code or copy. Use the new flame `live` color tokens
  for warmth.
- **Stories** for every reusable component
  (`*.stories.svelte` with `asChild`).
- **Tests** colocated as `*.test.ts`. Pure-function tests run in node
  Vitest; browser-only tests in client/storybook Vitest projects as
  appropriate.

## Color tokens — `live`

Light:

```css
--live: hsl(20 92% 48%); /* warm orange */
--live-foreground: hsl(0 0% 100%); /* white text on filled live */
--live-soft: hsl(20 90% 92%); /* tinted background */
--live-border: hsl(20 80% 60%);
```

Dark:

```css
--live: hsl(22 95% 64%); /* lighter for dark surface */
--live-foreground: hsl(20 60% 12%); /* deep brown text on filled */
--live-soft: hsl(20 50% 18%);
--live-border: hsl(22 80% 50%);
```

Surfaced via `@theme inline` mappings: `bg-live`, `text-live`,
`text-live-foreground`, `bg-live-soft`, `border-live`. Used only on the
right column / live actions / runtime artifacts. Phase 2 includes a
storybook palette demo so we can eyeball both modes.

## Out of scope (future plans)

- Other workflow×profile pages adopting `RunnableChecklist` (verifier
  presentation, issuer issuance, etc.).
- Persisted run state (URL query, localStorage, account-scoped).
- ngrok / LAN-IP convenience scripting for mobile-wallet testing.
- A "Use my own credential template" UX (replace the bundled VC).
- Production deploy of dependency services.

## Validation gates per phase

Each phase ends with `pnpm turbo check` and `pnpm turbo test`. The
cleanup phase additionally runs `pnpm turbo build` (= `pnpm turbo
validate`).

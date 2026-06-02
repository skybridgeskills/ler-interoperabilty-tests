# 2026-05-09 — Exchange Runner: Notes

## Scope of work

Make the test suite something a developer can actually point their wallet /
verifier / issuer at. Three intertwined pieces:

### 1. Local dev dependency services

Spin up two Docker images alongside the SvelteKit dev server and Storybook
so the suite can drive real protocol exchanges in development:

- **DCC Transaction Service** — `skybridgeskills/dcc-transaction-service`
  pinned to `sha256:bdc718e04bec809246429b31ec13ab35f521e5c7bbff211be25f434a06334109`.
  Provides exchange creation / participation endpoints we expose to the
  developer's wallet under test.
- **DCC Signing Service** — `skybridgeskills/dcc-signing-service`
  pinned to `sha256:ea486bc5c71f78cb93057fafad95885a1a33fd911aee348faee111283f158050`.
  Backs the transaction service for credential signing / DID resolution.

Both services need configuration, a port mapping, and (per the user) a
shared auth secret loaded from `.env`. Orchestrate via `docker compose`
with a turbo `dev:services` task so a single `pnpm turbo dev` (or a new
`pnpm turbo dev:full`) brings up everything in parallel.

### 2. Live-state design language

Introduce a new accent color in the Tokyo Night palette — a warm
orange/flame — semantically reserved for "live" / "in-flight" state:

- run state badges
- live action call-to-action buttons
- runtime-generated artifacts (interaction URLs, QR codes, exchange IDs)

Static / instructional / catalog content keeps the existing cool palette
(primary indigo + accent magenta-violet). The flame color is the visual
cue that "this thing is talking to a real service right now."

### 3. Runnable checklist layout + first integration

Create a new layout pattern for checklist pages with a 2-column grid:

- **Left column** — instructions (the existing ordered checklist, step
  titles + summaries + MUST/SHOULD bullets).
- **Right column** — run state. For each step on the left, the right column
  shows the corresponding test-run data, action buttons, or inputs aligned
  to that step.

Apply this layout to `/wallet/credential-acceptance/vcalm-eddsa`. At the
top, a CTA initiates an issuance exchange against the local transaction
service. Once the exchange is created, render:

- a QR code of the interaction URL
- a text input with the URL + a copy-to-clipboard button
- "waiting for wallet to fetch" status that updates as the wallet hits the
  exchange endpoint

Add a Storybook story for the new layout (Pages section) using mock state.

### Out of scope (this plan)

- Other workflow×profile pages adopting the runnable layout (only wallet
  acceptance × VCALM-EdDSA ships in this plan; the layout component is
  reusable for the rest later).
- Verifier-side or issuer-side runners (presentation request, direct
  delivery upload, etc.).
- Persistence of run state across page refreshes.
- CI / production deployment of the dependency services.
- Polling backoff strategies, websocket push, or anything beyond simple
  HTTP request/response and short-interval polling for status.
- Multi-tenant or auth-protected access to the suite itself.

## Current state of the codebase

Relevant existing pieces:

- **SvelteKit + Tailwind v4 + Tokyo Night theme** with light/dark via
  `.dark` class. Tokens in `src/routes/layout.css`. Display + headline +
  body + label utility classes. Fonts: Inter / JetBrains Mono.
- **shadcn-svelte primitives** in `src/lib/components/ui/`: Button, Card,
  Badge, Input, Tabs, Dialog. New primitives can be generated with the
  shadcn-svelte CLI.
- **Interop content model + accessors** at `src/lib/interop/` (just
  shipped). `WorkflowChecklist` component renders the static checklist.
- **Routes** for all 10 (role × workflow × profile) combinations, all
  prerendered. The wallet acceptance × VCALM page currently renders a
  static `WorkflowChecklist`.
- **No docker-compose** at repo root.
- **No turbo task** that orchestrates non-Node processes.
- **No QR code library**, no clipboard helpers, no ambient runtime client
  for any service.
- **No env handling for service URLs** (only the base `.env.example` for
  `CONTEXT` and `LOG_LEVEL`).

## Source of integration details

The user is sharing the transaction-service directory in this session.
That directory is expected to provide:

- API surface: how to create an exchange, how to inspect its state, the
  shape of the interaction URL.
- Auth model: what secret, in which header.
- Configuration: env vars the container expects (port, signing-service
  URL, secret, DID config, key material).
- Any docker-compose example we can pattern after.

We will hold integration-detail questions until that directory is
available, then refine `00-notes.md` and `00-design.md`.

## Style conventions (for this plan)

This plan touches new server-side service clients, UI components, layout,
docker orchestration, and theme tokens. The full style guide applies; the
parts most relevant:

- **Factory functions, not classes** for any service-client wrapper
  (`TransactionServiceClient(config)` returning a plain object).
- **`ZodFactory`** for any payload shape we define for the service API,
  paired with `type Foo = ReturnType<typeof Foo>`.
- **Providers** for injecting the service client into request context if
  we add server endpoints (`provideTransactionServiceClient`).
- **Domain-first layout** — service client + run-state machinery under
  `src/lib/server/domain/exchange-runner/` or similar (TBD in design).
- **File size ≤ ~200 lines.** Split client + types + config.
- **Naming** — `kebab-case.ts`, `PascalCase.svelte`, action verbs for
  operations (`createExchange`, `pollExchangeStatus`).
- **Stories** — every new reusable component ships a `*.stories.svelte`.

## Questions

Listed in the order we'll resolve them. Items marked **[needs service dir]**
require the transaction-service directory and are deferred until you've
shared it.

### Q1. Plan scope / phasing — one big plan or split

This work spans infrastructure (Docker), design tokens (palette), a new
layout pattern (component), and a feature integration (wallet acceptance ×
VCALM-EdDSA initiation). All four are useful on their own, but they're
also tightly coupled.

**Suggested course forward:** keep them in one plan but break them into
clearly-scoped phases so each phase is reviewable on its own:

1. Docker compose + turbo wiring + env scaffolding for the two services
   (no app code change).
2. Theme: add the flame "live" color in the Tokyo Night palette (light +
   dark) plus token names + storybook palette demo.
3. Service client: typed transaction-service client + zod payload schemas
   under `src/lib/server/domain/...`. Server endpoint(s) the page calls.
4. New `RunnableChecklist` layout component + storybook page-level story.
5. Wire up the wallet acceptance × VCALM-EdDSA route to use it: CTA +
   exchange creation + QR code + copy-link + status display.
6. Cleanup & validation.

### Q2. Turbo + Docker integration shape

How should `pnpm turbo dev` interact with Docker?

Options:

- (a) Add a `dev:services` script that runs `docker compose up`, and a
  turbo task that runs it persistently. `pnpm turbo dev` runs the
  SvelteKit dev server only; new `pnpm turbo dev:full` runs `dev` +
  `storybook` + `dev:services` together.
- (b) Make `dev:services` an implicit dependency of `dev` (so any
  `turbo dev` brings up services). Convenient but slow when you don't
  need them and harder to opt out.
- (c) Don't use turbo for services. Document a separate workflow:
  `pnpm services up` plus `pnpm dev` in another terminal.

**Suggested course forward:** (a). Adds a `pnpm turbo dev:full` (or
similarly named) task that boots the SvelteKit dev server, Storybook, and
`docker compose up` in parallel. Keeps `pnpm turbo dev` lean for
scenarios that don't need the services.

### Q3. Service URLs, ports, and configuration **[needs service dir]**

What ports, env vars, and config does each container need? What's the
default API base path? Until the service directory is shared we'll use
placeholders.

### Q4. Auth model **[needs service dir]**

What is the shared secret used for? Bearer token in `Authorization`
header? Mutual? Where does the suite's server code use it (server-only,
never exposed to the browser)?

### Q5. Exchange-creation API shape **[needs service dir]**

What's the request body / response shape for "create an exchange"? What's
in the interaction URL?

### Q6. State scope for the run

Run state is per-page-visit. Should we:

- (a) Keep it entirely in Svelte state on the page (lost on refresh).
- (b) Persist to URL query string so a refresh resumes the same exchange.
- (c) Persist to localStorage.

**Suggested course forward:** (a). Refresh discards the exchange — that's
acceptable for this plan since exchanges are short-lived. Persistence is
a follow-up if there's demand.

### Q7. Polling cadence + termination

Once an exchange is initiated, how often does the page check status?
What's the timeout?

**Suggested course forward:** poll every ~2s for up to 5 minutes, then
prompt the user to retry or cancel. If the wallet completes the exchange
the polling stops and the right column shows the success state.

### Q8. Layout pattern scope

The new split layout is needed only for wallet acceptance × VCALM in this
plan, but other future runners will want it too. Component name +
location?

**Suggested course forward:** new `RunnableChecklist` component under
`src/lib/components/interop/runnable-checklist/`. Reuses the same
checklist data structure but accepts an extra `state` snippet/prop per
step rendered in the right column. The static `WorkflowChecklist`
component stays as-is and is used by the other 9 routes.

### Q9. Color token name + role

Naming and semantic role of the new warm color.

**Suggested course forward:** semantic name `live` (token names like
`--live`, `--live-foreground`, classes like `text-live`, `bg-live`).
Reserved for run state, live actions, and runtime artifacts. The visual
hue is "flame" (warm orange) — implementation detail in the palette file
but consumers reference `--live`.

### Q10. QR-code rendering

Library choice. Options:

- (a) `qrcode` (npm) — generates SVG/canvas in the browser; small.
- (b) `qrcode-svg` — pure SVG output, SSR-friendly.
- (c) Hand-roll via a tiny Reed-Solomon implementation — overkill.

**Suggested course forward:** (a). The QR code is rendered after a user
action (post-CTA), so client-side rendering is fine. We can do a dynamic
`import('qrcode')` to keep the initial bundle small.

### Q11. Graceful degradation when services aren't running

If the transaction service is unreachable, the CTA should fail
informatively.

**Suggested course forward:** server endpoint catches the error and
returns a descriptive failure ("DCC transaction service is not reachable
at <url>. Run `pnpm turbo dev:full` or `pnpm services up` to start it.").
The page renders the message in the right column with a retry button.

### Q12. Storybook for the runnable-checklist page

What state should the story showcase?

**Suggested course forward:** three story variants:

- "Idle" — before user clicks the CTA (only the static checklist visible
  on the left, an inviting CTA at top, empty right column).
- "Awaiting wallet" — after exchange is created (QR + URL on right;
  step-aligned status indicators).
- "Success" — exchange completed, credential delivered, success state on
  right.

These use mock data; the story does not call the real service.

## Notes

### Resolved answers

- **Q1 — Plan shape:** one plan, six phases (Docker, palette, service client +
  endpoint, layout component + storybook, wallet-acceptance × VCALM
  integration, cleanup).
- **Q2 — Turbo + Docker:** opt-in via a new `dev:full` task. `pnpm turbo dev`
  stays lean; `pnpm turbo dev:full` runs SvelteKit + Storybook + `docker
compose up` in parallel. New `dev:services` script for services-only.
- **Q6 — Run state lifetime:** in-memory only. Refresh discards.
- **Q7 — Polling cadence:** every 2s, 5-minute timeout. Stops on
  completion or error.
- **Q8 — Layout pattern:** new `RunnableChecklist` component under
  `src/lib/components/interop/runnable-checklist/`. Coexists with the
  existing static `WorkflowChecklist`. Only wallet-acceptance × VCALM
  opts in this plan.
- **Q9 — Color token:** semantic name `live`. Tailwind tokens
  `bg-live`, `text-live`, `text-live-foreground`, etc. Visual hue is
  warm orange/flame in light + dark — implementation detail in the
  palette file.
- **Q10 — QR library:** `qrcode` (npm) via dynamic `import()` on the
  CTA-click code path so it doesn't enter the initial bundle.
- **Q11 — Graceful degradation:** inline error message + retry button in
  the right column. Hint to run `pnpm turbo dev:full` if services are
  down.
- **Q12 — Storybook for `RunnableChecklist`:** four story variants —
  Idle, Awaiting wallet, Success, Error / unreachable. All use mock
  state; no real service calls.

### Q3 — Service URLs, ports, env vars (resolved from transaction-service code)

Both services run in `docker compose` on the dev machine.

- **Transaction service** (`skybridgeskills/dcc-transaction-service@sha256:bdc7…`)
  - Listens on `4004` (env `PORT`).
  - Reaches the signing service via `SIGNING_SERVICE` URL (default
    `http://localhost:4006`; inside compose, `http://signing-service:4006`).
  - `EXCHANGE_HOST` / `DEFAULT_EXCHANGE_HOST` controls the public URL embedded
    in interaction URLs and QR codes. Default `http://localhost:4004` for
    dev. Optional ngrok / LAN-IP override is documented for mobile-wallet
    testing (out of scope for v1).
  - `PERSIST_TO_FILE=/data/exchanges.kv` keeps things simple — no Redis.
    Volume mount: `./.data/transaction-service:/data`.
  - `TENANT_TOKEN_DEFAULT=<shared-secret>` enables tenant auth; the same
    value lives in the suite's `.env`.
- **Signing service** (`skybridgeskills/dcc-signing-service@sha256:ea48…`)
  - Listens on `4006`.
  - Owns DID + key material. Mount a `./.data/signing-service` volume.
    Phase 1 includes a `docker run` smoke check to confirm the actual
    env vars / mount paths.

### Q4 — Auth model (resolved)

The suite uses a single shared `TENANT_TOKEN_DEFAULT` Bearer token from
`.env`. **Server-side only** — the SvelteKit server endpoints
(`/api/exchange-runner/...`) read it from `process.env`, attach
`Authorization: Bearer <token>`, and proxy to the transaction service.
The browser never sees the secret. The transaction service also exposes
OAuth 2.0 `client_credentials`, but it's unnecessary here.

### Q5 — Exchange-creation API shape (resolved)

Use the VC-API single-exchange endpoint with workflow `claim` (issuance
flow):

```
POST /workflows/claim/exchanges
Authorization: Bearer <TENANT_TOKEN_DEFAULT>
Content-Type: application/json

{
  "variables": {
    "tenantName": "default",
    "exchangeHost": "http://localhost:4004",
    "vc": "<stringified Open Badges 3 credential template>",
    "retrievalId": "<uuid>"
  }
}
```

Response (`getProtocols()`):

```json
{
  "iu": "http://localhost:4004/interactions/<exchangeId>",
  "vcapi": "http://localhost:4004/exchange/<exchangeId>/<txId>",
  "lcw": "https://lcw.app/request.html?…",
  "verifiablePresentationRequest": { "query": [...], "interact": {...},
                                     "challenge": "...", "domain": "..." }
}
```

The `iu` is what we render as the QR + copy-paste link. The wallet's
content-negotiated request to that URL returns the `protocols` JSON.

**Polling.** `GET /workflows/claim/exchanges/:exchangeId` returns the
exchange object with a `state` field (`'pending' | 'active' | 'complete'
| 'invalid'`). The right column maps state transitions to step-level
indicators.

**Sample VC template.** A bundled Open Badges 3 credential template
(eddsa-rdfc-2022, did:key issuer that matches the signing-service
config) is included in the suite's content module — see phase 3 for
the shape.

### Plan ready

All twelve questions resolved. Moving to `00-design.md` and the six
phase files.

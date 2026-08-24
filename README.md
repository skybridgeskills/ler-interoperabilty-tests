# LER Interoperability Test Suite

A self-help kit for developers building wallets, verifiers, and issuers for
Open Badges credentials and other Learning &amp; Employment Records.

The intent is to give credential-stack implementers an always-available
reference: run interop checks against your wallet, verifier, or issuer;
browse fixtures; and confirm your implementation behaves the way other
ecosystem participants expect. This repo houses the scaffolding; specific
test suites land in feature plans.

## Audience

- Wallet implementers validating acceptance, presentation, and revocation
  flows.
- Verifier implementers running conformance checks (trust, integrity,
  schema, status list).
- Issuer implementers running self-checks and round-trip fixtures with
  reference verifiers.

## Tech Stack

- **Framework:** SvelteKit 2 (Svelte 5, adapter-node)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 with the Tokyo Night palette (see
  [`docs/design-system.md`](docs/design-system.md))
- **UI primitives:** shadcn-svelte (bits-ui, tailwind-variants)
- **Testing:** Vitest (three projects: client browser, server node,
  storybook browser) + Playwright (e2e)
- **Component dev:** Storybook 10 with `@storybook/addon-vitest`
- **Logging:** pino
- **Validation:** zod 4 (via `ZodFactory`)
- **Task runner:** Turborepo
- **Package manager:** pnpm

## Setup

### Prerequisites

- Node.js (version pinned in `.nvmrc`)
- pnpm 10.22.0+

### Install + run

```sh
pnpm install
pnpm dev          # http://localhost:5173
pnpm storybook    # http://localhost:6006
```

## Turbo commands

```sh
pnpm turbo dev          # SvelteKit dev server
pnpm turbo build        # Production build (adapter-node)
pnpm turbo check        # prettier + eslint + svelte-check
pnpm turbo fix          # auto-fix prettier + eslint
pnpm turbo test         # 3 Vitest projects (client/server/storybook)
pnpm turbo e2e          # Playwright smoke (depends on build)
pnpm turbo storybook    # Storybook dev server
pnpm turbo validate     # check + test + build
```

## Project structure

```
src/
├── app.html               # HTML shell + Inter/JetBrains Mono fonts + flash-prevention script
├── app.d.ts               # App.Locals types
├── hooks.server.ts        # per-request runInContext(AppContext)
├── lib/
│   ├── assets/            # static assets (favicon, etc.)
│   ├── components/
│   │   ├── app-header/    # AppHeader + ThemeToggle
│   │   ├── coming-soon/   # ComingSoon shell
│   │   ├── theme-toggle/
│   │   └── ui/            # shadcn-svelte primitives (Button, Card, Badge, Input, Tabs, Dialog)
│   ├── pages/             # page-level components (LandingPage, …)
│   ├── server/
│   │   ├── app-context.ts        # AppContext type + accessor
│   │   ├── app-env.ts            # base env parser
│   │   ├── build-app-context.ts  # CONTEXT switch
│   │   ├── dev-app-context.ts    # pino-pretty + real time/id
│   │   ├── test-app-context.ts   # silent + fixed time + deterministic id
│   │   ├── services/
│   │   │   ├── id-service/
│   │   │   ├── logging/
│   │   │   └── time-service/
│   │   └── util/
│   │       ├── app-version.ts
│   │       ├── panic.ts
│   │       ├── provider/         # AsyncLocalStorage-based DI
│   │       └── zod-factory.ts
│   ├── storybook/                # ResponsivePreview helper
│   └── utils.ts                  # cn(), WithElementRef, etc.
└── routes/
    ├── +layout.svelte / layout.css
    ├── +page.svelte              # renders LandingPage
    ├── health/+server.ts         # GET /health → { status, version }
    ├── version/+server.ts        # GET /version → { name, version, … }
    ├── scenarios/[slug]/         # the generic scenario runner (no bespoke pages)
    ├── wallet/…                  # role landing + redirects to wallet scenarios
    ├── verifier/…                # role landing
    └── issuer/…                  # role landing
```

## Theming

Tokyo Night palette with light + dark modes. The `ThemeToggle` switches
between light and dark (icon shows current theme, hover/focus previews
the next); new visitors follow the OS until the first click. Choice is
persisted in `localStorage` and applied by toggling the `.dark` class on
`<html>`. An inline script in `app.html` applies the persisted theme
before paint to avoid flash.

Full palette + semantic tokens: [`docs/design-system.md`](docs/design-system.md).

## Architecture

[`docs/architecture.md`](docs/architecture.md) covers the provider DI
system, request context, the exchange runner (minting **and attach
mode**), theme system, and test harness.

The four wallet routes redirect to their scenarios preserving the query, so an
exchange minted outside the suite is still adopted by
`?exchangeId=…&workflow=claim|verify` — the scenario page does the adopting now. During a probe sitting,
`TRANSACTION_SERVICE_URL` must point at the transaction service that **actually
minted** the exchange. `pnpm dev:services:local` builds it from the sibling
checkout, so the composed service is the branch build; `pnpm dev:services` runs
digest-pinned images that predate the harness work. See
[`docker/README.md`](docker/README.md#two-stacks).

A **scenario** is the suite's runnable unit — a small measurement authored as
data and run at the one generic route `/scenarios/[slug]`, with no bespoke page.
Two prove the architecture on `credential-acceptance × oid4`:
`oid4-wallet-acceptance` (the migrated happy path) and
`oid4-wallet-refusal-discrimination` (three shuffled passes — valid, expired,
tampered — that ask the operator to tell a good credential from a bad one).
All four runnable wallet routes now **redirect** to their scenario, preserving
any `?exchangeId=…&workflow=` so attach mode keeps working — `claim` for the
acceptance pair, `verify` for the presentation pair. No runnable page route in
the suite is reachable any more.

A **badge** is what a full completion set earns: a self-attested Open Badges 3.0
recognition credential you claim into your own wallet when a set is complete,
from `/badges/[slug]`. It is **not** third-party certification, and it is **not**
un-earnable — the live meter can drop as the catalog grows, but a claimed badge
is a historical fact and stays claimed. The same page serves a stranger who
follows the credential's `criteria.id`.

Badges come in three tiers. **Essential** is a `(profile, role)`'s required set —
_OID4 Wallet Essentials_. **Expanded** adds that same profile's optional
scenarios, and is registered only where there are any. **Add-on** is one
protocol's slice of an additive profile — _DIC VCALM Wallet_ and _DIC OID4
Wallet_ are separate badges, each naming the protocol it covers — and an add-on
is claimable only once the Essential badge underneath it is earned. Twenty are
registered. See [`docs/architecture.md`](docs/architecture.md) § Badges,
[`docs/adr/2026-08-18-badge-award-model.md`](docs/adr/2026-08-18-badge-award-model.md)
and
[`docs/adr/2026-08-24-add-on-badges-per-base-profile.md`](docs/adr/2026-08-24-add-on-badges-per-base-profile.md).

## Moving results between machines

Scenario results and badge claims live in this browser's `localStorage`, so they
don't follow you to another machine on their own. The homepage's **Export /
import results** control (under your scenario sets) bridges the gap: **Export**
downloads a pretty-printed JSON bundle of both stores; **Import** reads one back.

Import is **per-scenario replacement, incoming copy wins** — each scenario in the
file overwrites its local result, scenarios not in the file are left alone, and
badge claims merge additively (a claim is never erased). Results scored against a
scenario the catalog has since changed simply drop, exactly as they would on a
normal read. The bundle carries no scenario definitions; this app is always the
source of truth.

## Contributing

- [`docs/style/README.md`](docs/style/README.md) — code conventions
  (factories, providers, schemas, naming, file layout, documentation).
- [`AGENTS.md`](AGENTS.md) — pattern checklist for AI agents.
- Pre-commit hook auto-formats staged files via Husky + lint-staged.
- CI runs `pnpm turbo check test` on every push and PR.

## License

MIT — see [`LICENSE`](LICENSE).

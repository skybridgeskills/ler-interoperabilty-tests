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
    ├── wallet/…                  # role landing + runnable wallet checklists
    ├── verifier/…                # role landing + runnable verifier checklists
    └── issuer/…                  # role landing + runnable issuer checklists
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
system, request context, theme system, and test harness.

## Contributing

- [`docs/style/README.md`](docs/style/README.md) — code conventions
  (factories, providers, schemas, naming, file layout, documentation).
- [`AGENTS.md`](AGENTS.md) — pattern checklist for AI agents.
- Pre-commit hook auto-formats staged files via Husky + lint-staged.
- CI runs `pnpm turbo check test` on every push and PR.

## License

MIT — see [`LICENSE`](LICENSE).

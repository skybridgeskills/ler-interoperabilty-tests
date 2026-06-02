# Phase 1 — Dependency services + turbo wiring

## Scope of phase

Stand up local dev infrastructure for the two DCC services. **No app-side
integration yet** — this phase ends when `pnpm turbo dev:full` brings the
services up and a `curl http://localhost:4004/healthz` returns 200.

- New `docker/compose.dev.yml` orchestrating both services at pinned
  digests.
- `.env.example` updated with the new environment knobs the suite will
  later consume.
- `package.json` adds `dev:services` (and `dev:full`).
- `turbo.jsonc` adds `dev:services` and `dev:full` tasks.
- `docker/README.md` runbook so a teammate can start / stop / wipe state.

## Code Organization Reminders

- One responsibility per file. The compose file lives under `docker/` so
  the runbook + future per-environment compose files have a home.
- Any temporary or workaround config gets a `# TODO:` comment.

## Style conventions

- Docker compose: pinned digests (no `:latest`).
- Env keys: `SCREAMING_SNAKE_CASE`.
- `.env.example` documents every key the suite reads.

## Implementation Details

### `docker/compose.dev.yml`

```yaml
name: ler-interoperability-test-suite-dev

services:
  signing-service:
    image: skybridgeskills/dcc-signing-service@sha256:ea486bc5c71f78cb93057fafad95885a1a33fd911aee348faee111283f158050
    container_name: lits-signing-service
    restart: unless-stopped
    ports:
      - '4006:4006'
    environment:
      PORT: 4006
    volumes:
      - ./.data/signing-service:/data

  transaction-service:
    image: skybridgeskills/dcc-transaction-service@sha256:bdc718e04bec809246429b31ec13ab35f521e5c7bbff211be25f434a06334109
    container_name: lits-transaction-service
    restart: unless-stopped
    depends_on:
      - signing-service
    ports:
      - '4004:4004'
    environment:
      PORT: 4004
      DEFAULT_EXCHANGE_HOST: http://localhost:4004
      SIGNING_SERVICE: http://signing-service:4006
      PERSIST_TO_FILE: /data/exchanges.kv
      TENANT_TOKEN_DEFAULT: ${TENANT_TOKEN_DEFAULT:?must be set in .env}
      ACCESS_JWT_SECRET: ${ACCESS_JWT_SECRET:?must be set in .env}
    volumes:
      - ./.data/transaction-service:/data
```

(`compose.dev.yml` runs from the **repo root** so the `./.data/*` volume
paths resolve there. Add `.data/` to `.gitignore` and `.dockerignore`.)

Smoke-check the actual signing-service env requirements with a `docker
run --rm skybridgeskills/dcc-signing-service@sha256:ea48… --help` (or by
inspecting the published image) during this phase. If additional env
vars (e.g. DID seed, key file) are required, append them to the service
block. Document any deviation in `docker/README.md`.

### `.env.example` additions

```sh
# Exchange runner — local DCC services
EXCHANGE_RUNNER_ENABLED=false
TRANSACTION_SERVICE_URL=http://localhost:4004
TRANSACTION_SERVICE_TENANT_NAME=default
TRANSACTION_SERVICE_TENANT_TOKEN=replace-me-in-.env
TENANT_TOKEN_DEFAULT=replace-me-in-.env
ACCESS_JWT_SECRET=replace-me-with-a-long-random-string
```

`TRANSACTION_SERVICE_TENANT_TOKEN` and `TENANT_TOKEN_DEFAULT` are the
**same secret**: one is read by the transaction-service container; the
other by the suite's server endpoints. Document this in
`docker/README.md`.

### `package.json` scripts

```jsonc
{
	"scripts": {
		"dev:services": "docker compose -f docker/compose.dev.yml --env-file .env up",
		"dev:services:down": "docker compose -f docker/compose.dev.yml down",
		"dev:full": "turbo run dev:full"
	}
}
```

(There's a single `dev:full` turbo task that orchestrates the parallel
work; the npm script just defers to turbo.)

### `turbo.jsonc` additions

```jsonc
{
	"tasks": {
		"dev:services": {
			"cache": false,
			"persistent": true,
			"interactive": true
		},
		"dev:full": {
			"cache": false,
			"persistent": true,
			"interactive": true,
			"dependsOn": []
		}
	}
}
```

Wire `dev:full` to fan out to `dev`, `storybook`, and `dev:services`
running concurrently. The cleanest way (single command, ergonomic
output) is to add a top-level npm script that invokes all three turbo
tasks in parallel:

```jsonc
{
	"scripts": {
		"dev:full": "turbo run dev storybook dev:services --concurrency=10"
	}
}
```

If turbo doesn't like running three persistent tasks in one invocation,
fall back to `concurrently` (already in node_modules transitively or as
a small dev dep). Decide during implementation; document in
`docker/README.md`.

### `docker/README.md`

A short runbook covering:

- `pnpm turbo dev:full` — full local stack.
- `pnpm dev:services` — services only.
- `pnpm dev:services:down` — stop and remove containers (state in
  `./.data/*` persists).
- "Reset state": `rm -rf .data/transaction-service`.
- Mobile-wallet tunneling (set `DEFAULT_EXCHANGE_HOST` in `.env` to the
  ngrok / LAN URL; restart compose).

### `.gitignore` / `.dockerignore`

Add `.data/`. Verify it's not already ignored.

## Validate

- `pnpm dev:services` brings up both containers.
- `curl -fsS http://localhost:4004/healthz` returns 200.
- `curl -fsS http://localhost:4006/healthz` returns 200 (or whatever the
  signing-service health endpoint is — verify in this phase).
- `pnpm turbo dev:full` brings up SvelteKit + Storybook + services in
  parallel; ctrl+C cleanly tears them all down.
- `pnpm turbo check && pnpm turbo test` still pass (no app code changed
  yet).

No app code is touched in this phase, so unit tests should be
unaffected.

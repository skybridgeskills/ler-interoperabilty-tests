# Docker — local DCC dependency services

The exchange runner needs two services running locally:

- `dcc-transaction-service` (port 4004) — issues VC-API exchanges.
- `dcc-signing-service` (port 4006) — signs credentials on behalf of the
  transaction service.

`docker/compose.dev.yml` orchestrates both at pinned digests. State
persists under `docker/.data/` (gitignored — relative paths in compose
resolve from the file's own directory).

## First-time setup

1. Copy `.env.example` to `.env` and fill in the secrets:

   ```sh
   cp .env.example .env
   ```

   Required keys:
   - `TENANT_TOKEN_DEFAULT` — any long random string. Both the
     transaction-service container **and** the SvelteKit suite use it.
   - `ACCESS_JWT_SECRET` — another long random string for OAuth2 token
     signing inside the transaction service.
   - `TRANSACTION_SERVICE_TENANT_TOKEN` — set this to the **same value**
     as `TENANT_TOKEN_DEFAULT`.

   The compose file fails fast if `TENANT_TOKEN_DEFAULT` or
   `ACCESS_JWT_SECRET` are missing.

2. Pull the images once (optional — `up` will pull on demand):

   ```sh
   docker compose -f docker/compose.dev.yml --env-file .env pull
   ```

## Day-to-day commands

```sh
pnpm dev:services          # start both services in the foreground
pnpm dev:services:down     # stop and remove containers (state survives)
pnpm dev:full              # SvelteKit dev + Storybook + services in parallel
```

`pnpm dev:full` runs the services through `scripts/dev-services.sh`, a
wrapper around `docker compose up` that traps the shutdown signal and
runs `docker compose stop` on exit. This guarantees the containers stop
when you quit the turbo session (ctrl-c / quit turbo / close terminal),
however turbo terminates the task. Teardown uses `stop` (not `down`), so
containers restart fast and state under `docker/.data/` survives.

`pnpm turbo dev` (without `:full`) keeps the suite-only flow — useful
when you're only working on UI / storybook and don't need the live
runner. `pnpm dev:services` / `pnpm dev:services:down` remain the manual
foreground fallback for running the compose stack on its own.

## Reset state

```sh
pnpm dev:services:down
rm -rf docker/.data/transaction-service docker/.data/signing-service
```

## Mobile / cross-device wallet testing

The interaction URLs embedded in QR codes default to
`http://localhost:4004/...`, which a phone on the same network cannot
reach. To test from another device, set `DEFAULT_EXCHANGE_HOST` in
`.env` to a publicly reachable URL (LAN IP or an ngrok tunnel) before
starting the services:

```sh
# Example with ngrok
ngrok http 4004
# copy the https://<id>.ngrok-free.app URL into .env:
DEFAULT_EXCHANGE_HOST=https://<id>.ngrok-free.app

pnpm dev:services:down
pnpm dev:services
```

Restart compose after every change to `.env`.

## Troubleshooting

- **`port is already allocated`** — another process is using 4004 or 4006. Kill it or change the host port in `compose.dev.yml`.
- **`unauthorized` from the transaction service** — `TENANT_TOKEN_DEFAULT`
  in `.env` doesn't match `TRANSACTION_SERVICE_TENANT_TOKEN`. Make
  them identical and restart.
- **suite shows "DCC services unreachable"** — check `pnpm
dev:services` is running and `curl -fsS http://localhost:4004/healthz`
  returns 200.

## Bumping the dcc-transaction-service image

When the transaction-service image is republished with newer code (e.g.
to pick up the OID4VCI Pre-Authorized Code Flow that the suite now
expects), bump the pinned digest:

```sh
docker pull skybridgeskills/dcc-transaction-service:<tag>
docker inspect skybridgeskills/dcc-transaction-service:<tag> \
  --format '{{index .RepoDigests 0}}'
```

Replace the `image:` line for `transaction-service` in
`compose.dev.yml` with the returned digest, then restart:

```sh
pnpm dev:services:down
pnpm dev:services
```

Sanity check that the new field flows through:

```sh
# Substitute <id> with an exchangeId from a fresh `POST /exchange`.
curl -fsS http://localhost:4004/workflows/claim/exchanges/<id>/protocols \
  | jq .protocols.OID4VCI
```

An `openid-credential-offer://?credential_offer_uri=…` value confirms
the runner UI's OID4VCI tab will receive a real URL. If the field
prints `null`, the running image still predates the OID4VCI work — the
runner panel will gracefully fall back to VCALM-only.

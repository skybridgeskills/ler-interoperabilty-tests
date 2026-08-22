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

   `TENANT_SEED_DEFAULT` is what makes the tenant exist on the **signing**
   service, which has no fallback: a signing tenant with no seed answers
   `404 Tenant doesn't exist` and every claim fails at the signing step.
   `generate` is fine to start with, but it makes a fresh key at container
   start, so the issuer DID changes on every restart — set a fixed seed once
   you care that previously-issued credentials keep verifying.

## Pinned cryptosuites, and the second tenant

Some scenarios **pin** a `(cryptosuite, didMethod)` pair — the
`data-integrity-cryptosuites` wallet scenarios ask whether your wallet can
verify an ECDSA-signed credential, which only means something if we really
issue one.

**Pinning can only be a tenant swap.** The transaction service chooses its
issuer instance at _claim_ time, ranking the tenant's instances against the
cryptosuites the **wallet** advertised; nothing the suite sends when creating an
exchange can request a suite. So the only way to force ECDSA is to mint under a
tenant whose sole issuer instance is ECDSA. `resolveIssuingContext` makes that
choice and the create route carries it in the Bearer token — the tenant never
appears in a URL.

Running single-tenant is fully supported. A pinned scenario this deployment
cannot serve renders **disabled** with a typed reason and **keeps its
requirements in the completion denominator**, so the badge is blocked rather
than quietly made easier to earn.

To turn the ECDSA tenant on, set both halves of the pair in `.env`:

```sh
# what the SUITE presents (read by the SvelteKit app)
TRANSACTION_SERVICE_TENANT_2_NAME=ecdsa
TRANSACTION_SERVICE_TENANT_2_TOKEN=<a long random string>
TRANSACTION_SERVICE_TENANT_2_CRYPTOSUITE=ecdsa-rdfc-2019

# what the CONTAINERS accept (must match the token above)
TENANT_TOKEN_ECDSA=<the same string>
TENANT_SEED_ECDSA=generate
```

`compose.dev.yml` already declares the matching
`TENANT_ISSUER_1_{ID,CRYPTOSUITE,SIGNING_TENANT}_ECDSA` and
`TENANT_CRYPTOSUITE_ECDSA`, so nothing else is needed.

Confirm it works by running a pinned scenario and reading `proof.cryptosuite`
off the delivered credential — it must be `ecdsa-rdfc-2019`. If it comes back
`eddsa-rdfc-2022` the exchange was minted under the default tenant, which means
the suite-side token and the container-side token disagree.

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

## Attach mode and probe sittings

The compose stack is **not** the right transaction service for an interop probe
sitting. `compose.dev.yml` pins `dcc-transaction-service` **by digest**, and the
pinned image predates the interop-harness work: it has no `exchangeIdPrefix` on
mint, no `tamper` seam, no exchange journal, and no PEX selector.

**This is a publishing lag, not a missing feature.** All of it exists in
`dcc-transaction-service` on `feat/interop-harness-phase-a`; no image has been
built from that branch yet. Once it merges and a release is published, bump the
digest and compose regains the lot — see
[Bumping the dcc-transaction-service image](#bumping-the-dcc-transaction-service-image).
Until then, run the branch build on the host.

The caller-authored `vc` payload **does** work against the pinned image — a
credential recipe's document arrives intact, so expiry, rich content and
not-yet-valid scenarios all run on compose. What does not work is anything that
needs a post-signing seam: sending `tamper: 'proof' | 'claim'` against the
pinned image is accepted with a 200 and then **silently dropped**, so the wallet
receives a perfectly valid credential and a discrimination scenario quietly
measures nothing. Verified 2026-08-13 against
`sha256:bdc718e0…`; `variables.tamper` is absent from the stored exchange while
`vc` is present. Run those scenarios against the host branch build until the
digest is bumped.

Attach mode (`/wallet/credential-{acceptance,presentation}/{vcalm,oid4}?exchangeId=…&workflow=…`)
adopts an exchange minted **outside** the suite. Point it at the pinned
container and the CLI's exchange simply will not be there — or will come back
without the probe tag and without the journal entry the run is scored from — and
the failure reads exactly like a wallet defect. That misattribution is the whole
risk: **check the harness before you blame the wallet.**

So, during a sitting:

1. Stop the composed transaction service, which otherwise holds port 4004:

   ```sh
   docker compose -f docker/compose.dev.yml stop transaction-service
   ```

2. Run the harness build of `dcc-transaction-service` on the **host**, on 4004.
3. Point the suite at it in `.env`:

   ```sh
   TRANSACTION_SERVICE_URL=http://localhost:4004
   ```

4. Confirm you are talking to the harness, not the pinned image, before the
   first probe:

   ```sh
   # Substitute <id> with an exchangeId the probe CLI just minted.
   curl -fsS http://localhost:4004/workflows/claim/exchanges/<id>/protocols | jq .protocols
   ```

   A 404 here means the suite and the CLI are not looking at the same service.

The signing service can stay on compose — the digest pin only bites for the
transaction service.

## Troubleshooting

- **`port is already allocated`** — another process is using 4004 or 4006. Kill it or change the host port in `compose.dev.yml`.
- **`unauthorized` from the transaction service** — `TENANT_TOKEN_DEFAULT`
  in `.env` doesn't match `TRANSACTION_SERVICE_TENANT_TOKEN`. Make
  them identical and restart.
- **suite shows "DCC services unreachable"** — check `pnpm
dev:services` is running and `curl -fsS http://localhost:4004/healthz`
  returns 200.
- **a runnable page opened with `?exchangeId=` says the exchange was not
  found** — the suite and whatever minted the exchange are pointed at
  different transaction services. See
  [Attach mode and probe sittings](#attach-mode-and-probe-sittings).

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

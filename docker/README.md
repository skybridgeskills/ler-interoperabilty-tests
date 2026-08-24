# Docker — local dependency services

The exchange runner needs local services running:

- `dcc-transaction-service` (port 4004) — mints VC-API / OID4VC exchanges.
- `dcc-signing-service` (port 4006) — signs credentials for the transaction service.
- `vcalm-status-service` (port 4008) — allocates revocation-list entries. **Local
  stack only** (see [Two stacks](#two-stacks)).

## Two stacks

There are **two commands, and no selector**. Which one you ran is visible in your
shell history; nothing flips a default underneath you.

```sh
pnpm dev:services         # PINNED: published images at fixed digests
pnpm dev:services:local   # LOCAL: all three built from sibling checkouts
```

**Right now, scenario work needs `pnpm dev:services:local`.** The pinned images
predate the interop-harness work by months, and the gap is not cosmetic — see
[What the pinned stack cannot do](#what-the-pinned-stack-cannot-do). The pinned
stack is the _end state_: once the harness branch merges and images are
published, bumping the digests restores it as the default. Until then it is kept
working, and honest about what it is missing.

`pnpm dev:services:down` tears down **either** stack — both share the compose
project name `ler-interoperability-test-suite-dev`, so one teardown command is
enough. It passes `--remove-orphans`, which is what reaches the status service:
that container belongs to the project but is declared only in
`compose.local.yml`, so a plain `down -f compose.dev.yml` would leave it running
on port 4008.

### Mixed mode is not supported

Do not run one service on the host and another in compose. The composed
transaction service reaches signing at the **container DNS name**
`signing-service:4006`; a host-run signing service would have to be reached at
`host.docker.internal:4006`, which nothing is configured to do. Both stacks bind
the same host ports (4004 / 4006), so **one stack at a time** — a `port is
already allocated` error means the other one, or a host process, is still up.

## First-time setup

```sh
cp .env.example .env
pnpm dev:services:local
```

That is the whole of it. **No secrets to fill in.** Everything the containers
read is committed under `docker/env/`, because every value there is a local-only
literal that must never appear on a deployed environment — the same reason
`dcc-signing-service` ships a committed test seed. The values say what they are
(`local-dev-only-not-a-secret-…`), so a copy into somewhere real is self-evident.

The local build needs three sibling checkouts beside this repo:

```
<parent>/dcc/dcc-transaction-service
<parent>/dcc/dcc-signing-service
<parent>/vcalm-status-service          # note: NOT under dcc/
```

Override any of them by exporting a shell variable before the command —
`TRANSACTION_SERVICE_SRC`, `SIGNING_SERVICE_SRC`, `STATUS_SERVICE_SRC`. That is
as far as source-directory configuration goes.

## How configuration is laid out

| File                         | Read by                                           | Committed?      |
| ---------------------------- | ------------------------------------------------- | --------------- |
| `docker/env/transaction.env` | the transaction-service container                 | yes             |
| `docker/env/signing.env`     | the signing-service container                     | yes             |
| `docker/env/status.env`      | the status-service container (local stack only)   | yes             |
| `docker/env/*.local.env`     | the same containers, **after** the committed file | no — gitignored |
| `.env`                       | the SvelteKit app                                 | no — gitignored |

`compose.dev.yml` contains **no `${…}` interpolation and names no tenant**. It
declares services, ports, volumes and `env_file:` blocks, and nothing else.
Compose reads an `env_file` list in order with **later files winning**, which is
what makes a `.local.env` overlay work. `--env-file .env` is gone: every variable
it ever carried was a container variable.

**Adding a tenant** is therefore three small edits: a seed and cryptosuite in
`signing.env`, a token (and any issuer instance) in `transaction.env`, and one
`TRANSACTION_SERVICE_TENANT_<n>_*` group in `.env`.

### Why a tenant's token is written in two places

`docker/env/transaction.env` configures the **container**; `.env` configures the
**app**. That looks like duplication and is not: a deployed LITS has no
containers at all, and points at a transaction service it did not start. There is
no one file that could hold both. Keep the pair identical — a mismatch shows up
as `unauthorized` from the transaction service.

### `TENANT_CRYPTOSUITE_<T>` is not optional

The signing service's `selectSuite` falls through an **unset** cryptosuite to
`Ed25519Signature2020`, which is not a `DataIntegrityProof`. Every
`credential-di-proof-*` check would then fail against that tenant, silently. Both
tenants in `signing.env` set it explicitly for that reason.

## Tenants, and pinning a cryptosuite

The local stack serves two `did:key` tenants:

| Tenant    | Cryptosuite       | For                          |
| --------- | ----------------- | ---------------------------- |
| `default` | `eddsa-rdfc-2022` | every elective scenario      |
| `ecdsa`   | `ecdsa-rdfc-2019` | scenarios that **pin** ECDSA |

**Pinning can only be a tenant swap.** The transaction service chooses its issuer
instance at _claim_ time, ranking the tenant's instances against the cryptosuites
the **wallet** advertised; nothing the suite sends when creating an exchange can
request a suite. So the only way to force ECDSA is to mint under a tenant whose
sole issuer instance is ECDSA. `resolveIssuingContext` makes that choice and the
create route carries it in the Bearer token — the tenant never appears in a URL.

Running single-tenant is fully supported. A pinned scenario a deployment cannot
serve renders **disabled** with a typed reason and **keeps its requirements in
the completion denominator**, so the badge is blocked rather than quietly made
easier to earn.

### Confirming a pinned cryptosuite actually works

Run a pinned scenario and read `proof.cryptosuite` off the delivered credential.
It must be `ecdsa-rdfc-2019`. If it comes back `eddsa-rdfc-2022`, the exchange was
minted under the default tenant — the suite-side and container-side tokens
disagree. If it comes back with **no `cryptosuite` at all** and
`proof.type: Ed25519Signature2020`, you are on the pinned stack, whose signing
image predates the knob entirely.

You can check the signing service directly, without a wallet:

```sh
curl -s -X POST http://localhost:4006/instance/ecdsa/credentials/sign \
  -H 'Content-Type: application/json' \
  -d '{"@context":["https://www.w3.org/ns/credentials/v2"],
       "type":["VerifiableCredential"],
       "issuer":"did:example:placeholder",
       "credentialSubject":{"id":"did:example:subject"}}' | jq .proof
```

A tenant that does not exist answers `Tenant doesn't exist` instead, which is how
you tell a missing tenant from a mis-signed one.

## What the pinned stack cannot do

Verified 2026-08-22 against the digests in `compose.dev.yml`. The
signing-service image is dated **2025-10-28** and the transaction-service image
**2026-04-30**.

- **No `DataIntegrityProof`, for any tenant.** The pinned signing image predates
  `TENANT_CRYPTOSUITE_<T>` and signs `Ed25519Signature2020` regardless of what
  `signing.env` says. Every `credential-di-proof-*` check fails against it, and
  so does every pinned-cryptosuite scenario — not only the ECDSA ones.
- **No `tamper` seam.** `tamper` is accepted with a 200 and then **silently
  dropped**, so the wallet receives a perfectly valid credential. This is the
  dangerous one: it made `vcalm-wallet-refusal-discrimination` **fail a
  conformant wallet** — the tampered pass offered a valid credential, the
  operator honestly answered "accepted", and the concealed answer was "refused".
  The `tamper-recorded` automatic check now catches this and reports _"the
  exchange records no tamper instruction"_ instead. That works against any pin,
  current or stale, which a digest bump never could.
- **VCALM only — no OID4VCI / OID4VP.** The four `oid4-wallet-*` scenarios cannot
  run at all.
- **No `exchangeIdPrefix`, no exchange journal, no PEX selector**, and none of the
  three exchange-variation fields (`oid4vpQueryLanguage`, `vprLimitDisclosure`,
  `vprAdvertiseCryptosuites`).
- **No status service**, and none is started. `STATUS_SERVICE` is deliberately set
  **only** in `compose.local.yml`, never in the shared `docker/env/transaction.env`
  — the claim path allocates a status entry _before_ signing, so a dangling
  `STATUS_SERVICE` would fail every claim on this stack.

## The status service

Runs in the local stack only, at port 4008, with `STORAGE_MODE=sqlite` and a
volume — **not** `memory`, which forgets every list when the process exits and
would break every credential already pointing at one. `SIGNING_MODE=local` signs
in-process with the key material in `docker/env/status.env`, so it needs no tenant
on the signing service.

That tenant was minted **once, at implementation**, by the service's own CLI:

```sh
pnpm provision-tenant --tenant lits_local --domains status.lits.test --print-only
```

**You never run this.** The output is committed in `docker/env/status.env`. The
service has no provisioning endpoint and never will — provisioning is a write to
whatever registry the service reads, and today that registry is env.

## Day-to-day commands

```sh
pnpm dev:services          # the pinned stack, foreground
pnpm dev:services:local    # the local-build stack, foreground (rebuilds on change)
pnpm dev:services:down     # stop and remove either stack (state survives)
pnpm dev:full              # SvelteKit dev + Storybook + the PINNED services
```

`pnpm dev:full` runs the services through `scripts/dev-services.sh`, a wrapper
that traps the shutdown signal and runs `docker compose stop` on exit, so the
containers stop however turbo terminates the task. Teardown uses `stop` (not
`down`), so containers restart fast and state under `docker/.data/` survives.
`dev:full` starts the **pinned** stack; for scenario work run `pnpm dev` and
`pnpm dev:services:local` side by side.

## Reset state

```sh
pnpm dev:services:down
rm -rf docker/.data/transaction-service docker/.data/signing-service docker/.data/status-service
```

## Mobile / cross-device wallet testing

Interaction URLs default to `http://localhost:4004/...`, which a phone on the
same network cannot reach. Point `DEFAULT_EXCHANGE_HOST` at something reachable
in a **gitignored overlay** rather than editing the committed file:

```sh
# docker/env/transaction.local.env
DEFAULT_EXCHANGE_HOST=https://<id>.ngrok-free.app
```

```sh
ngrok http 4004
pnpm dev:services:down && pnpm dev:services:local
```

Restart compose after every change — env files are read at container start.

## Attach mode and probe sittings

Attach mode
(`/wallet/credential-{acceptance,presentation}/{vcalm,oid4}?exchangeId=…&workflow=…`)
adopts an exchange minted **outside** the suite. Point it at a service that never
minted that exchange and the failure reads exactly like a wallet defect. That
misattribution is the whole risk: **check the harness before you blame the
wallet.**

With `pnpm dev:services:local` the composed transaction service _is_ the branch
build, so a probe sitting can run against it directly. If you would rather run the
CLI's service on the host, stop the composed one first — it holds port 4004:

```sh
docker compose -f docker/compose.dev.yml stop transaction-service
```

Then confirm you are talking to the service that minted the exchange, before the
first probe:

```sh
# Substitute <id> with an exchangeId the probe CLI just minted.
curl -fsS http://localhost:4004/workflows/claim/exchanges/<id>/protocols | jq .protocols
```

A 404 here means the suite and the CLI are not looking at the same service.

## Troubleshooting

- **`port is already allocated`** — the other stack, or a host process, is on 4004
  / 4006 / 4008. Mixed mode is unsupported; stop the other one.
- **`unauthorized` from the transaction service** — `TENANT_TOKEN_<T>` in
  `docker/env/transaction.env` and the matching `TRANSACTION_SERVICE_TENANT_*_TOKEN`
  in `.env` disagree. See
  [Why a tenant's token is written in two places](#why-a-tenants-token-is-written-in-two-places).
- **`error getting credentials`, or a build that sits at _load metadata_ forever**
  — Docker Desktop's credential helper has hung. Restart Docker Desktop. The base
  images are public, so this is not an authentication problem; the helper is
  simply not answering.
- **a claim fails at the status step** — only the local stack runs a status
  service. If you are on the pinned stack, `STATUS_SERVICE` should be unset;
  check it has not leaked into `docker/env/transaction.env`.
- **suite shows "DCC services unreachable"** — check the stack is running and
  `curl -fsS http://localhost:4004/healthz` returns 200.
- **a runnable page opened with `?exchangeId=` says the exchange was not found** —
  the suite and whatever minted the exchange are pointed at different transaction
  services. See [Attach mode and probe sittings](#attach-mode-and-probe-sittings).

## Bumping the pinned digests

**Deliberately not done yet.** The pinned stack is what a merged branch restores;
bumping to an image built from an unmerged branch would make it a second moving
target. Once the harness work merges and images are published:

```sh
docker pull skybridgeskills/dcc-transaction-service:<tag>
docker inspect skybridgeskills/dcc-transaction-service:<tag> \
  --format '{{index .RepoDigests 0}}'
```

Replace the `image:` line in `compose.dev.yml`, then restart and sanity-check that
the new fields flow through:

```sh
curl -fsS http://localhost:4004/workflows/claim/exchanges/<id>/protocols | jq .protocols.OID4VCI
```

An `openid-credential-offer://?credential_offer_uri=…` value confirms the OID4VCI
tab will receive a real URL. `null` means the image still predates that work.

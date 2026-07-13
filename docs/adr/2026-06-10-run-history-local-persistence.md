# Run-history local persistence model

- Status: superseded
- Date: 2026-06-10
- Superseded by: [2026-07-11 Run-history v2: flat, id-keyed record with checklist-drift detection](./2026-07-11-run-history-v2-flat-record.md)
- Context: Landing personalization + run history (homepage console)

> **Superseded (2026-07-11).** The discriminated-`payload` record described here
> was replaced by a flat, id-keyed v2 record that stores per-requirement
> statuses plus a checklist-drift fingerprint. The `localStorage` medium,
> per-combination retention (cap 3), and framework-free model still hold; the
> record shape and `.v1` key do not. See the superseding ADR.

## Context

The homepage shows the most recent result of each `(role, workflow, profile)`
checklist combination. Two existing runnable pages (wallet credential
acceptance; issuer direct issuance) produce two different result shapes — an
exchange-poll derivation and an `IssuerRunnerReport`. We need somewhere to
persist run outcomes and a record shape that covers both, without standing up
server-side storage for what is currently a single-user, single-device
self-test tool.

## Decision

Persist run history in the browser's `localStorage`, with a single normalized
record type and per-combination retention.

1. **Storage medium: `localStorage`, browser-only.** One key,
   `lits.run-history.v1`, holding `Record<combinationKey, TestRunRecord[]>`
   (newest-first). All access is isolated in
   `src/lib/client/run-history/run-history-store.ts` and guarded against SSR.
   Pure model + status derivation live framework-free in
   `src/lib/interop/run-history/` and are unit-tested.

2. **Record shape: a `ZodFactory` discriminated union.** `TestRunRecord` keys
   on `{ role, workflow, profile }`, carries a normalized
   `status: 'passed' | 'failed' | 'incomplete'`, and a `payload` discriminated
   on `kind: 'exchange' | 'issuer-report'` that keeps the raw, kind-specific
   data close to the wire/render needs. Status is derived once at record time
   (`statusFromExchange`, `statusFromIssuerReport`) so the UI never re-derives.

3. **Retention: latest 3 per combination, in one helper.** Eviction is
   per-combination (not global) and lives only in
   `applyRetention(records)`, which today slices to
   `MAX_RUNS_PER_COMBINATION = 3`.

4. **Versioning + safe reads.** The `.v1` key suffix lets a future schema
   change migrate rather than break. Reads `safeParse` every entry and drop
   malformed ones; invalid JSON is treated as empty. The store never throws to
   the UI.

5. **Forward hook for pinning.** `TestRunRecord.pinned` is reserved (optional,
   unset in MVP) and `applyRetention` is the single place that would grow
   pin-preserving logic — so manual pin/evict can ship later without an API or
   schema break.

## Alternatives considered

- **Server-side persistence.** Rejected for MVP: adds a datastore, an API, and
  auth/identity questions for a tool that is currently local self-testing.
  Revisit if cross-device history or shared results become requirements.
- **A single flat/global list of runs.** Rejected: the homepage needs the
  latest result _per combination_; per-combination retention keeps lookups
  O(1) by key and bounds storage predictably.
- **Storing the raw runner result verbatim (no normalized status).** Rejected:
  the homepage row needs one comparable status across two unlike result shapes;
  normalizing at write time keeps the row dumb and the two payloads still
  available for richer future views.

## Consequences

- Run history is **device-local and silently lost** if the user clears storage
  or switches devices/browsers. Acceptable for a self-test tool; documented.
- No server round-trip; the homepage reads history once on mount (no live
  cross-tab refresh in MVP).
- Adding a new runnable page means adding a constructor call + `recordRun`;
  adding a new `payload.kind` is an additive union change plus a derivation
  helper.
- A schema change requires bumping the key suffix and (optionally) a migration;
  until then, malformed entries are dropped, not surfaced.

# Run-history v2: flat, id-keyed record with checklist-drift detection

- Status: accepted
- Date: 2026-07-11
- Supersedes: [2026-06-10 Run-history local persistence model](./2026-06-10-run-history-local-persistence.md)
- Context: Shareable run reports (persist enough of a run to render + share it)

## Context

The v1 record ([2026-06-10](./2026-06-10-run-history-local-persistence.md)) stored
a normalized `status` plus a `payload` discriminated on
`kind: 'exchange' | 'issuer-report' | 'wallet-report' | 'verifier-report'`. That
shape captured _how_ a run was produced but not _what each requirement resolved
to_, so it could not render a shareable, per-requirement report. It also had no
stable identity for a single run and no way to notice that the checklist a run
scored against has since changed.

Shareable run reports need three things v1 lacked: a stable per-run `id` to
address one run; the presentation-ready status of every requirement row; and a
way to tell that a stored run is stale because the live checklist drifted.

## Decision

Replace the discriminated-payload record with a flat, id-keyed v2 record and add
a checklist-drift fingerprint. Bump the storage key to `.v2` and abandon `.v1`.

1. **Flat, id-keyed record.** `TestRunRecord` v2 is a single flat object:
   `{ id, role, workflow, profile, ranAt, status, checklistFingerprint,
statuses, error?, pinned? }`. `id` defaults to `crypto.randomUUID()` and
   `ranAt` to `new Date().toISOString()` in the factory. The four per-kind
   payload types and the `payload` union are gone; the four `*RunRecord`
   assemblers collapse to one `testRunRecord(args)`. The `RunStatus` factory and
   the `statusFrom*` derivation helpers stay — pages still compute the overall
   `status` from their runner result.

2. **`RequirementStatus` persisted without `raw`.** The per-requirement row
   status type is hoisted framework- and server-free into
   `src/lib/interop/run-history/requirement-status.ts` as a `ZodFactory`
   (`{ tone, label, message?, attested? }`). Runs store `statuses:
Record<requirementId, RequirementStatus>`. The live in-memory superset
   `RequirementStatusView = RequirementStatus & { raw?: unknown }` keeps the
   collapsible debug body, which is deliberately **not** persisted. The mappers
   (`outcomeToRequirementStatus`, …) stay in `components/` because they depend on
   the server `CheckOutcome`; only the data type crosses into `interop/`.

3. **Reference-live checklist + strict fingerprint drift.** A run is not a
   snapshot of the checklist text. It stores only `statuses` (keyed by
   requirement id) plus a `checklistFingerprint` —
   `runChecklistFingerprint(requirements)`, a deterministic, order-independent
   djb2 hash over the sorted set of `id␟level␟text` for the combined checklist
   (base + additives). Rendering resolves requirement copy from the **live**
   checklist by id. `isRunOutdated(record, currentRequirements)` compares
   fingerprints; an outdated run is blocked from being shared/treated as
   authoritative and must be re-run. There is no snapshot and no partial
   reconciliation — drift is all-or-nothing.

4. **Abandon-on-bump, no migration.** The store key becomes
   `lits.run-history.v2`. The v1 store is not migrated: v1 records lack per-row
   statuses and a fingerprint, so any attempt to render them as v2 reports would
   be dishonest. The store never reads `.v1` and removes it on first write.
   Reads still `safeParse` every entry and silently drop malformed ones. A new
   `runById(id)` scans the (≤3 × #combinations) buckets for a single run.

Unchanged from v1: browser `localStorage`, per-combination retention capped at 3
via `applyRetention`, SSR-guarded store access, framework-free model in
`src/lib/interop/run-history/`, and the reserved `pinned` hook.

## Alternatives considered

- **Snapshot the checklist text into each run.** Rejected: it duplicates the
  checklist, drifts out of sync with the source profiles, and bloats storage.
  Referencing the live checklist by id + a fingerprint keeps one source of truth
  and makes drift explicit rather than silently stale.
- **Migrate v1 → v2.** Rejected: v1 has no per-requirement statuses or
  fingerprint to synthesize from, so a migration would fabricate report data.
  Abandoning the handful of local, device-only v1 records is cheaper and honest.
- **Keep the payload union, add statuses alongside it.** Rejected: the payloads
  encoded producer-specific detail the report never renders; carrying both a
  union and a status map is redundant. The flat record is the minimum a report
  needs.
- **A cryptographic fingerprint.** Unnecessary: the fingerprint is used only for
  equality-based drift detection, never for security, so a small non-crypto hash
  (djb2) is sufficient and dependency-free.

## Consequences

- Run history remains device-local and silently lost on storage-clear or
  device/browser switch (unchanged from v1; acceptable for a self-test tool).
- A checklist edit (any `id`/`level`/`text` change to a combination's base or
  additive requirements) flips every prior run for that combination to
  outdated → the user must re-run before sharing. This is intended: reports must
  reflect the current checklist.
- Adding a runnable page means one `testRunRecord` call with a real
  `checklistFingerprint` (from `runChecklistFingerprint(combinedRequirements(…))`)
  and a populated `statuses` map, then `recordRun`.
- During the migration window, thin back-compat shims kept the old assembler
  names (`exchangeRunRecord`, `issuerReportRunRecord`, `walletRunRecord`,
  `verifierReportRunRecord`) building v2 records with an empty `statuses` map and
  a placeholder fingerprint, so the not-yet-migrated pages compiled. Those shims
  have since been removed — every runnable page now calls `testRunRecord`
  directly with a real `statuses` map and fingerprint.

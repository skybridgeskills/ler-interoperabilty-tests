# Scenario run record and completion

- Status: accepted
- Date: 2026-08-13
- Supersedes: [2026-07-11 Run-history v2: flat, id-keyed record with checklist-drift detection](./2026-07-11-run-history-v2-flat-record.md)
- Context: Scenario architecture M4 — the persisted result and the meter's
  arithmetic, landing alongside the demolition of the combination-keyed store

## Context

Run history was keyed by `(role, workflow, profile)` and held the latest three
`TestRunRecord`s per combination, with drift detected by hashing the combined
checklist. Every part of that is invalidated by
[scenario-as-runnable-unit](./2026-08-13-scenario-as-runnable-unit.md): the
combination is no longer runnable, `statuses` was keyed by a requirement
vocabulary that is being deleted, and `checklistFingerprint` hashed a
`profile.checklists` on its way out.

Meanwhile the meter and the badge need one shared answer to "how far along is
this `(profile, role)` set?" — and the two must never disagree, because they
render under the same header.

## Decision

**A new store, `lits.scenario-runs.v1`, holding one `ScenarioRunRecord` per
scenario keyed by slug.** The old keys are removed on first write and never
read. There is no migration.

- **One result per scenario — the latest — plus an `attempts` counter.** Holding
  history costs one schema bump later (the store's value type becomes an array;
  the record travels unchanged). The array is deliberately not pre-built.
  `recordScenarioRun` owns the increment so no call site can get it wrong.
- **Each outcome denormalises the raw answer, the expected answer, the derived
  status and the `automated | attested` source.** The expected answer looks
  redundant beside the catalog and is not: it is what lets a stored run render
  its reveal after the catalog has moved on.
- **Drift drops the record.** A record whose `fingerprint` no longer matches the
  live scenario — or whose slug the catalog no longer holds — is silently
  discarded on read, and the row reverts to "not run". There is no `outdated`
  state anywhere.
- **Completion is evaluated over memberships, in requirements**, by a single
  pure function, governed by: the unit is the requirement not the scenario; a
  `oneOf` group is one obligation that stops gating once a member passes;
  `optional` memberships are excluded from the base meter and get their own;
  a blocked obligation keeps its requirements in the denominator and contributes
  nothing to the numerator; only a `pass` counts as met.
- **`isClaimable()` is the only claimability predicate in the codebase.** The
  meter's fill and the badge's affordance both call it.

**Deleted outright**, not deprecated: `TestRunRecord` and its status
derivations, the v2 store with `applyRetention` / `runCombinationKey` /
`runById`, `checklist-fingerprint.ts` (`runChecklistFingerprint`,
`isRunOutdated`), the `/runs/[id]` reopen-and-print route with its `.run-report`
print styles, and `RunHistorySummary` / `RunResultBadge`.

## Alternatives considered

**Migrate the v2 records.** Rejected as impossible rather than merely
undesirable: the bucket key names a combination that is no longer the runnable
unit, `statuses` is keyed by requirement ids that are being deleted, and the
stored fingerprint hashes a structure that will not exist. Any migration would
have to invent the scenario a run belonged to. Existing runs are transient and
trivially recreated.

**Keep both stores alive until the last page migrates.** Rejected: two stores,
two record shapes and two drift models coexisting for the length of the
migration, for the benefit of run history on pages that are being deleted. The
accepted cost is that un-migrated pages stop persisting — they still drive real
exchanges and still show live per-step status.

**Keep an array of records per scenario now, to avoid a later schema bump.**
Rejected. Nothing in the UI wants more than the latest, `attempts` is the cheap
stand-in for "you have been here before", and the bump is affordable when
comparison is actually built.

**Declare `attempts` at the call site.** Rejected — it is exactly the kind of
counter that drifts. The store reads the previous record and increments.

**Let a blocked scenario drop out of the denominator.** Rejected, and this is
the load-bearing one. It would mean two deployments could issue badges that look
identical and mean different things. A blocked obligation blocks the badge.

**Let the meter and the badge each compute completeness.** Rejected: they share
a header, so any divergence is a visible lie.

## Consequences

- **The eight un-migrated runnable pages record nothing.** They still run and
  still show live per-step status; `ChecklistRow` is statusless, and the
  homepage shows no run results until the completion group lands. This is the
  accepted consequence of dropping rather than migrating.
- Editing a shipped requirement id, statement, level, answer shape or step
  action drops every stored result for that scenario. Intended — it is why the
  fingerprint excludes cosmetic fields.
- `requirement-status.ts` survived the deletion as
  `interop/checklist-status.ts`, and `combinedRequirements` as
  `interop/combined-requirements.ts`. Both are checklist-era _presentation_
  vocabulary that the surviving pages still render through; neither has anything
  to do with persistence. They are deleted when `profile.checklists` is.
- The `CannotServe` type moved from the server's `resolve-issuing-context.ts`
  into `interop/scenarios/`, because completion evaluation is client-side and
  needs it. Only the resolution against deployment config stays server-side.

## Note (2026-08-22, M13 — the predicted deletions happened)

The Consequences above end with _"They are deleted when `profile.checklists`
is."_ M13 deleted `profile.checklists`, and with it both modules named there —
the requirement-status vocabulary and `combinedRequirements`. Neither path
exists any more; the paragraph is kept because it records **why** they outlived
the run record, which is the part still worth reading.

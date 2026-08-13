import { ScenarioRunRecord } from '$lib/interop/scenario-run/index.js';
import { scenarioBySlug, scenarioFingerprint } from '$lib/interop/scenarios/index.js';

/**
 * A new namespace, not a `.v3` of run history — the unit changed from a
 * `(role, workflow, profile)` combination to a scenario, so nothing about the
 * old store's shape survives.
 */
const STORAGE_KEY = 'lits.scenario-runs.v1';

/**
 * Removed on first write. There is **no migration** from either: existing runs
 * are transient and trivially recreated, and migration was never available
 * anyway — the bucket key died with the combination page, `statuses` was keyed
 * by a deleted requirement vocabulary, and `checklistFingerprint` hashed a
 * `profile.checklists` that no longer exists.
 */
const LEGACY_KEYS = ['lits.run-history.v2', 'lits.run-history.v1'];

/** A flat map, not an array per bucket — one result per scenario is all the UI wants. */
type RunMap = Record<string, ScenarioRunRecord>;

/**
 * Persist a finished run, incrementing `attempts`.
 *
 * The counter lives here rather than in the caller so no call site can get it
 * wrong: a retry is just another `recordScenarioRun`, and the count follows.
 */
export function recordScenarioRun(record: ScenarioRunRecord): void {
	const map = readMap();
	const previous = map[record.scenarioSlug];
	map[record.scenarioSlug] = {
		...record,
		attempts: (previous?.attempts ?? 0) + 1
	};
	writeMap(map);
}

/** The stored result for one scenario, or `undefined` if there is none — or it drifted. */
export function scenarioRunFor(slug: string): ScenarioRunRecord | undefined {
	return readMap()[slug];
}

/** Every stored result, keyed by scenario slug. Drifted and unknown records are already gone. */
export function allScenarioRuns(): RunMap {
	return readMap();
}

/** Test seam: remove all persisted results. */
export function clearScenarioRuns(): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.removeItem(STORAGE_KEY);
}

/**
 * Read, validate, and **drop anything that no longer describes a live scenario**.
 *
 * Two things are dropped silently:
 *
 * - a record whose `fingerprint` differs from the live scenario's — the
 *   definition changed in a way that affects scoring, so the stored result no
 *   longer means what it says. The row simply reverts to "not run"; there is no
 *   "outdated, must re-run" state to render.
 * - a record for a slug the catalog no longer holds.
 *
 * This is also what makes the export bundle safe to carry no scenario
 * definitions: records from a catalog that has moved on just drop on import.
 *
 * Never throws. Invalid JSON or a malformed entry is dropped so the UI sees a
 * clean map.
 */
function readMap(): RunMap {
	if (typeof localStorage === 'undefined') return {};
	const raw = localStorage.getItem(STORAGE_KEY);
	if (!raw) return {};

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return {};
	}
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

	const result: RunMap = {};
	for (const [slug, value] of Object.entries(parsed as Record<string, unknown>)) {
		const check = ScenarioRunRecord.schema.safeParse(value);
		if (!check.success) continue;

		const scenario = scenarioBySlug(slug);
		if (!scenario) continue;
		if (scenarioFingerprint(scenario) !== check.data.fingerprint) continue;

		result[slug] = check.data;
	}
	return result;
}

function writeMap(map: RunMap): void {
	if (typeof localStorage === 'undefined') return;
	for (const key of LEGACY_KEYS) localStorage.removeItem(key);
	localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

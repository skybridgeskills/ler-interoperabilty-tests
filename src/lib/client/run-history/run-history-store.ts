import type { ProfileSlug, RoleSlug, WorkflowSlug } from '$lib/interop/profile-schema.js';
import { TestRunRecord } from '$lib/interop/run-history/test-run-record.js';

/** Maximum number of runs retained per (role, workflow, profile) combination. */
export const MAX_RUNS_PER_COMBINATION = 3;

/** localStorage key. `.v1` suffix lets future schema changes migrate. */
const STORAGE_KEY = 'lits.run-history.v1';

type HistoryMap = Record<string, TestRunRecord[]>;

/** Stable key identifying one (role, workflow, profile) combination. */
export function runCombinationKey(
	role: RoleSlug,
	workflow: WorkflowSlug,
	profile: ProfileSlug
): string {
	return `${role}:${workflow}:${profile}`;
}

/**
 * Trim a combination's run list to the retained set. Records arrive
 * newest-first, so we keep the head.
 *
 * Today this is a simple cap. Future: preserve `pinned` records even when
 * they fall outside the newest-N window (keep all pinned, then fill the
 * remaining slots with the newest unpinned runs).
 */
export function applyRetention(records: TestRunRecord[]): TestRunRecord[] {
	return records.slice(0, MAX_RUNS_PER_COMBINATION);
}

/** Record a run: prepend to its combination, apply retention, persist. */
export function recordRun(record: TestRunRecord): void {
	const map = readMap();
	const key = runCombinationKey(record.role, record.workflow, record.profile);
	const next = applyRetention([record, ...(map[key] ?? [])]);
	map[key] = next;
	writeMap(map);
}

/** The most recently recorded run for a combination, if any. */
export function latestRunFor(
	role: RoleSlug,
	workflow: WorkflowSlug,
	profile: ProfileSlug
): TestRunRecord | undefined {
	return runsFor(role, workflow, profile)[0];
}

/** All retained runs for a combination, newest-first. */
export function runsFor(
	role: RoleSlug,
	workflow: WorkflowSlug,
	profile: ProfileSlug
): TestRunRecord[] {
	const map = readMap();
	return map[runCombinationKey(role, workflow, profile)] ?? [];
}

/** The latest run for every known combination, keyed by combination key. */
export function allLatestRuns(): Map<string, TestRunRecord> {
	const map = readMap();
	const result = new Map<string, TestRunRecord>();
	for (const [key, records] of Object.entries(map)) {
		if (records[0]) result.set(key, records[0]);
	}
	return result;
}

/** Test seam: remove all persisted run history. */
export function clearRunHistory(): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.removeItem(STORAGE_KEY);
}

/**
 * Read + validate the persisted map. Never throws: invalid JSON or any
 * malformed entries are dropped silently so the UI sees a clean map.
 */
function readMap(): HistoryMap {
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

	const result: HistoryMap = {};
	for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
		if (!Array.isArray(value)) continue;
		const valid: TestRunRecord[] = [];
		for (const entry of value) {
			const check = TestRunRecord.schema.safeParse(entry);
			if (check.success) valid.push(check.data);
		}
		if (valid.length) result[key] = valid;
	}
	return result;
}

function writeMap(map: HistoryMap): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

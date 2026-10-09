import { scenarioBySlug, scenarioFingerprint } from '$lib/interop/scenarios/index.js';

import { ScenarioRunRecord } from './run-record.js';

/** A flat map of scenario results, keyed by slug. The store's value shape. */
export type RunRecordMap = Record<string, ScenarioRunRecord>;

/**
 * The one drift rule, in one place.
 *
 * Validate a raw slug→record map and **drop anything that no longer describes a
 * live scenario**:
 *
 * - a malformed entry (bad shape or bad JSON upstream) — dropped, never thrown;
 * - a slug the catalog no longer holds;
 * - a record whose `fingerprint` differs from the live scenario's — the
 *   definition changed in a way that affects scoring, so the stored result no
 *   longer means what it says.
 *
 * Both the run store (on read) and M9's import (`applyBundle`) run records
 * through **this** function rather than reimplementing the check. That single
 * code path is what lets the export bundle carry no scenario definitions: a
 * record from a catalog that has moved on drops on import by exactly the rule it
 * would drop by on read.
 */
export function liveRunRecords(raw: unknown): RunRecordMap {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

	const result: RunRecordMap = {};
	for (const [slug, value] of Object.entries(raw as Record<string, unknown>)) {
		const check = ScenarioRunRecord.schema.safeParse(value);
		if (!check.success) continue;

		const scenario = scenarioBySlug(slug);
		if (!scenario) continue;
		if (scenarioFingerprint(scenario) !== check.data.fingerprint) continue;

		result[slug] = check.data;
	}
	return result;
}

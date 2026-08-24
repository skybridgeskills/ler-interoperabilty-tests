import { allBadgeClaims, replaceBadgeClaims } from '$lib/client/badges/index.js';
import {
	applyBundle,
	buildBundle,
	liveRunRecords,
	parseBundle,
	type ResultStore
} from '$lib/interop/scenario-run/index.js';

import { allScenarioRuns, replaceScenarioRuns } from './scenario-run-store.js';

/**
 * The only browser-API part of the export/import bundle: a Blob download on the
 * way out and a file read on the way in. Everything it decides — the envelope,
 * the drift rule, the incoming-wins merge — lives in the pure `bundle` module;
 * this file just moves bytes across the browser boundary and reads/writes the
 * two client stores.
 */

/** Read both stores as the in-memory pair the bundle carries. */
function currentStore(): ResultStore {
	return { results: allScenarioRuns(), badges: allBadgeClaims() };
}

/**
 * Serialise the stores to pretty-printed JSON and hand the browser a download.
 *
 * `now` is a parameter so a test can pin it; production passes the wall clock.
 */
export function exportResults(now: string = new Date().toISOString()): void {
	const json = JSON.stringify(buildBundle(currentStore(), now), null, 2);
	downloadJson(json, `lits-results-${now.slice(0, 10)}.json`);
}

/** What an import did, or why it could not proceed — for the affordance to report. */
export type ImportOutcome =
	| { ok: true; scenarios: number; badges: number }
	| { ok: false; error: string };

/**
 * Read a bundle file and fold it into the stores.
 *
 * Per-scenario replacement with incoming winning (drifted / unknown / malformed
 * records drop) and additive, deduplicated badge merge — all decided by
 * `applyBundle`. Reports a clear error for non-JSON or a wrong format/version
 * rather than silently doing nothing, and never throws to the caller.
 */
export async function importResults(file: File): Promise<ImportOutcome> {
	let raw: unknown;
	try {
		raw = JSON.parse(await file.text());
	} catch {
		return { ok: false, error: 'This file is not valid JSON.' };
	}

	const parsed = parseBundle(raw);
	if (!parsed.ok) return parsed;

	const before = currentStore();
	const next = applyBundle(parsed.bundle, before);
	replaceScenarioRuns(next.results);
	replaceBadgeClaims(next.badges);

	return {
		ok: true,
		scenarios: Object.keys(liveRunRecords(parsed.bundle.results)).length,
		badges: next.badges.length - before.badges.length
	};
}

function downloadJson(json: string, filename: string): void {
	if (typeof document === 'undefined' || typeof URL === 'undefined') return;

	const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	URL.revokeObjectURL(url);
}

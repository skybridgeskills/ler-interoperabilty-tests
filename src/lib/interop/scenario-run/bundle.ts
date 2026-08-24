import { z } from 'zod';

import { BadgeClaimSnapshot } from '$lib/interop/badges/index.js';
import { ZodFactory } from '$lib/util/zod-factory.js';

import { liveRunRecords, type RunRecordMap } from './live-records.js';
import { ScenarioRunRecord } from './run-record.js';

/**
 * The export/import envelope.
 *
 * **The bundle is the two client stores verbatim in a thin wrapper:** `results`
 * is exactly the run store's map (same keys, same record shape), `badges` is
 * exactly the badge store's array of claim snapshots. Nothing is transformed on
 * the way out. Keeping it byte-identical is what keeps the deferred agent
 * surface open — a bundle that reshaped the stores would have to be re-derived
 * every time a store changed.
 *
 * No scenario definitions ride along: the app is the source of truth, and the
 * `fingerprint` in each record is the link back. Records from a catalog that has
 * moved on drop on import, by the same drift rule the store applies on read.
 */
export const ResultBundle = ZodFactory(
	z.object({
		format: z.literal('lits.scenario-results'),
		version: z.literal(1),
		exportedAt: z.string(),
		results: z.record(z.string(), ScenarioRunRecord.schema),
		badges: z.array(BadgeClaimSnapshot.schema)
	})
);
export type ResultBundle = ReturnType<typeof ResultBundle>;

/** The pair of client stores a bundle carries, in memory. */
export type ResultStore = {
	results: RunRecordMap;
	badges: BadgeClaimSnapshot[];
};

/**
 * Wrap the stores in the envelope, verbatim.
 *
 * `results` and `badges` are passed straight through — this must produce a
 * `results` map byte-identical to the store's. `exportedAt` is supplied by the
 * caller so this stays pure and testable.
 */
export function buildBundle(store: ResultStore, exportedAt: string): ResultBundle {
	return ResultBundle({
		format: 'lits.scenario-results',
		version: 1,
		exportedAt,
		results: store.results,
		badges: store.badges
	});
}

/**
 * Fold a bundle into the current stores.
 *
 * **Results: per-scenario replacement, incoming copy wins.** Scenarios absent
 * from the bundle are untouched. Predictability beats cleverness, and it needs
 * no conflict UI. Incoming records pass through {@link liveRunRecords} — the
 * same drift rule a read applies — so a record whose fingerprint has drifted,
 * whose slug the catalog no longer holds, or that is malformed simply drops
 * rather than landing stale or throwing.
 *
 * **Badges: additive merge.** A claim snapshot is a historical fact; importing
 * must not erase one the local store already holds. New snapshots are appended
 * and the result is deduplicated by `(badgeSlug, claimedAt)`.
 */
export function applyBundle(bundle: ResultBundle, current: ResultStore): ResultStore {
	const incoming = liveRunRecords(bundle.results);

	const results: RunRecordMap = { ...current.results };
	for (const [slug, record] of Object.entries(incoming)) {
		results[slug] = record; // incoming wins
	}

	const badges = [...current.badges];
	const seen = new Set(badges.map(claimKey));
	for (const claim of bundle.badges) {
		const key = claimKey(claim);
		if (seen.has(key)) continue;
		seen.add(key);
		badges.push(claim);
	}

	return { results, badges };
}

/** Identity of a claim snapshot: `(badgeSlug, claimedAt)`. */
function claimKey(claim: BadgeClaimSnapshot): string {
	return `${claim.badgeSlug}\u0000${claim.claimedAt}`;
}

/** A parsed bundle, or a human-readable reason it could not be read. */
export type BundleParse = { ok: true; bundle: ResultBundle } | { ok: false; error: string };

/**
 * Validate an already-JSON-parsed value as a bundle, reporting a clear reason
 * rather than silently doing nothing. Wrong `format` and wrong `version` — the
 * mistakes a hand-picked or stale file makes — get their own messages; anything
 * else is reported as malformed. Pure; the file read lives in `bundle-io`.
 */
export function parseBundle(raw: unknown): BundleParse {
	const check = ResultBundle.schema.safeParse(raw);
	if (check.success) return { ok: true, bundle: check.data };

	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
		return { ok: false, error: 'This file is not a results bundle.' };
	}
	const obj = raw as Record<string, unknown>;
	if (obj.format !== 'lits.scenario-results') {
		return { ok: false, error: 'This file is not a results bundle.' };
	}
	if (obj.version !== 1) {
		return {
			ok: false,
			error: `Unsupported bundle version ${JSON.stringify(obj.version)}; expected 1.`
		};
	}
	return { ok: false, error: 'This results bundle is malformed.' };
}

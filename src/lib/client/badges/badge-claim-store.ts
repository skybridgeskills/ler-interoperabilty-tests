import { BadgeClaimSnapshot } from '$lib/interop/badges/index.js';

/**
 * A new namespace beside `lits.scenario-runs.v1`, not a section inside it —
 * because the two stores obey **opposite drift rules**. A run record drops when
 * its scenario's fingerprint drifts (a stale result reverts to "not run"); a
 * claim snapshot is a **historical fact** and must survive the catalog moving
 * on, or "k new since" cannot be said. Two opposite rules in one store would be
 * a bug waiting to happen.
 *
 * Both stores serialise into M9's `{ …, results, badges }` bundle — `results`
 * from the run store, `badges` from this one, verbatim.
 */
const STORAGE_KEY = 'lits.badges.v1';

/**
 * Every claim snapshot. An array — a badge can be re-claimed (a fresh snapshot),
 * and M9 dedupes on `(badgeSlug, claimedAt)`.
 *
 * **No drift-drop.** Unlike the run store, nothing here consults the catalog or
 * compares a fingerprint: a snapshot from a catalog that has moved on is still a
 * true record of a claim that happened. Malformed entries (bad JSON, or a
 * non-conforming object) are dropped silently so the UI sees a clean array;
 * never throws.
 */
export function allBadgeClaims(): BadgeClaimSnapshot[] {
	if (typeof localStorage === 'undefined') return [];
	const raw = localStorage.getItem(STORAGE_KEY);
	if (!raw) return [];

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return [];
	}
	if (!Array.isArray(parsed)) return [];

	return parsed.flatMap((entry) => {
		const check = BadgeClaimSnapshot.schema.safeParse(entry);
		return check.success ? [check.data] : []; // drop malformed — but NEVER on drift
	});
}

/** The most recent snapshot for a badge slug, or `undefined`. */
export function latestClaimFor(badgeSlug: string): BadgeClaimSnapshot | undefined {
	return allBadgeClaims()
		.filter((claim) => claim.badgeSlug === badgeSlug)
		.sort((a, b) => (a.claimedAt < b.claimedAt ? 1 : -1))[0];
}

/**
 * Persist a snapshot. Idempotent on `(badgeSlug, claimedAt)` so a double-write
 * cannot duplicate a claim; a different `claimedAt` adds a new snapshot.
 */
export function recordBadgeClaim(snapshot: BadgeClaimSnapshot): void {
	if (typeof localStorage === 'undefined') return;
	const current = allBadgeClaims();
	const exists = current.some(
		(claim) => claim.badgeSlug === snapshot.badgeSlug && claim.claimedAt === snapshot.claimedAt
	);
	const next = exists ? current : [...current, snapshot];
	localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

/**
 * Overwrite every persisted claim **verbatim** — the import seam (M9).
 *
 * `applyBundle` has already merged the incoming snapshots additively and
 * deduplicated by `(badgeSlug, claimedAt)`; this writes that result whole. It
 * keeps the store the sole writer of localStorage even for a bulk replace.
 */
export function replaceBadgeClaims(snapshots: BadgeClaimSnapshot[]): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
}

/** Test seam: remove all persisted claims. */
export function clearBadgeClaims(): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.removeItem(STORAGE_KEY);
}

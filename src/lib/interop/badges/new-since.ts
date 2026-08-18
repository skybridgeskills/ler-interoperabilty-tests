import type { BadgeClaimSnapshot } from './claim-snapshot.js';

/**
 * "k new since" — the requirements that entered the set **after** a claim.
 *
 * A **membership** diff, not a fingerprint compare: a requirement that changed
 * shape (new scenario fingerprint) but kept its id is *not* "new since"; a
 * genuinely added requirement is. That is the honest reading of *"4 new since"* —
 * the badge still stands, and this only counts what has been added on top.
 */
export function newSince(
	snapshot: BadgeClaimSnapshot,
	currentRequirementIds: string[]
): { count: number; ids: string[] } {
	const then = new Set(snapshot.requirementIds);
	const ids = currentRequirementIds.filter((id) => !then.has(id));
	return { count: ids.length, ids };
}

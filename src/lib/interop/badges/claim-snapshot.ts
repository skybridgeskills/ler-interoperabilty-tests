import { z } from 'zod';

import { ZodFactory } from '$lib/util/zod-factory.js';

import { requirementIdsBehindBadge } from './accessors.js';
import { badgeFingerprint } from './badge-fingerprint.js';
import type { BadgeDefinition } from './badge-schema.js';

/**
 * A claim, persisted. The shape M9's export bundle serialises verbatim in its
 * `badges` array.
 *
 * Identity is **`(badgeSlug, claimedAt)`** — both load-bearing: M9 dedupes on
 * them and a badge may be re-claimed (a second snapshot). Carries the
 * `fingerprint` at claim time (so a stale `?v=` link is detectable) and the
 * requirement-id set at claim time (so "k new since" is computable once the
 * catalog grows). Unlike a run record, a snapshot **never drift-drops** — a
 * claim is a historical fact, and "k new since" is the whole point.
 */
export const BadgeClaimSnapshot = ZodFactory(
	z.object({
		badgeSlug: z.string().min(1),
		/** ISO. Identity, with `badgeSlug`. */
		claimedAt: z.string().min(1),
		/** The badge fingerprint at claim time — the `?v=` the claim was made against. */
		fingerprint: z.string().min(1),
		/** The requirement ids the set held at claim time. Sorted. */
		requirementIds: z.array(z.string()).default([])
	})
);
export type BadgeClaimSnapshot = ReturnType<typeof BadgeClaimSnapshot>;

/** Build a snapshot for a badge, at a given claim time, from the live catalog. */
export function claimSnapshot(badge: BadgeDefinition, claimedAt: string): BadgeClaimSnapshot {
	return BadgeClaimSnapshot({
		badgeSlug: badge.slug,
		claimedAt,
		fingerprint: badgeFingerprint(badge),
		requirementIds: requirementIdsBehindBadge(badge)
	});
}

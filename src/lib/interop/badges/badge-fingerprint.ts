import { djb2Hex, scenarioFingerprint } from '$lib/interop/scenarios/scenario-fingerprint.js';

import { scenariosBehindBadge } from './accessors.js';
import type { BadgeDefinition } from './badge-schema.js';

/**
 * The badge's `?v=` version — a fingerprint over the **scoring content of its
 * whole set**, composed from the per-scenario {@link scenarioFingerprint}s
 * through the **same** djb2 hash the scenario drift check uses.
 *
 * Member fingerprints are **sorted** before composition, so the badge's version
 * depends on *which* scenarios are in the set and *what they score*, never on
 * their catalog order — a reordered catalog must not read as a version bump.
 * It changes exactly when a member's scoring content changes (or the set's
 * membership changes), and not when any cosmetic copy changes — because
 * `scenarioFingerprint` already excludes copy.
 */
export function badgeFingerprint(badge: BadgeDefinition): string {
	const members = scenariosBehindBadge(badge).map(scenarioFingerprint).sort();
	return djb2Hex(members.join('|'));
}

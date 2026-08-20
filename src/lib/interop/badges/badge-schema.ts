import { z } from 'zod';

import { AdditiveProfileSlug } from '$lib/interop/additive-profile-schema.js';
import { ProfileSlug, RoleSlug } from '$lib/interop/profile-schema.js';
import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * A badge names a **completion sub-set** and turns it into a claimable
 * recognition credential. Its identity is a `(profile, role)` key the meter
 * counts over, **plus the tier that decides which sub-set within that key it
 * scores** — not a persona, not a product name.
 *
 * Three tiers across two axes:
 *
 * - `base` — the `required` (and `oneOf`) scenarios of a **base** profile-role.
 *   The everyday badge, e.g. "OID4 Wallet".
 * - `complete` — the `optional` scenarios of the **same** base profile-role. A
 *   second, distinct badge ("— Complete") for an implementer who covers the
 *   profile-role fully. It is **not** an additive: `complete` keys to the base
 *   profile and scores that profile's own optional set. (This replaces the M8
 *   sketch where a complete badge scored an *additive's* set.)
 * - `additive` — the whole set of an **additive** profile-role, a separate
 *   single-tier axis (one meter, one badge, no core/expanded split).
 *
 * Two things are deliberately kept apart:
 *
 * - **Domain** — `slug`, `tier`, the profile (`baseProfile` / `additiveProfile`)
 *   and `role`: the `(profile, role, sub-set)` a badge is claimed against. These
 *   never enter presentation.
 * - **Presentation** — `name`, `description`, `criteriaSummary`. Copy only, and
 *   therefore **excluded from the badge fingerprint** (`badge-fingerprint.ts`),
 *   so rewording a badge's name never invalidates a claim.
 */
export const BadgeTier = ZodFactory(z.enum(['base', 'complete', 'additive']));
export type BadgeTier = ReturnType<typeof BadgeTier>;

/** Identity + presentation fields every tier shares. */
const badgeCopy = {
	/** e.g. `oid4-wallet`. Kebab. Names the badge and the `/badges/[slug]` route. */
	slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
	role: RoleSlug.schema,
	/** Presentation. Excluded from the fingerprint. */
	name: z.string().min(1),
	/**
	 * What the achievement is — the OB3 `Achievement.description` (required by
	 * the spec) and the credential's top-level `description`. Presentation.
	 */
	description: z.string().min(1),
	/** One line describing the bar, for `criteria.narrative`. Presentation. */
	criteriaSummary: z.string().min(1)
};

export const BadgeDefinition = ZodFactory(
	z.discriminatedUnion('tier', [
		// Base and Complete both key to a base profile-role; the tier picks the
		// required sub-set (base) or the optional sub-set (complete) of it.
		z.object({ tier: z.literal('base'), baseProfile: ProfileSlug.schema, ...badgeCopy }),
		z.object({ tier: z.literal('complete'), baseProfile: ProfileSlug.schema, ...badgeCopy }),
		// An additive badge is single-tier on its own axis, keyed to the additive.
		z.object({
			tier: z.literal('additive'),
			additiveProfile: AdditiveProfileSlug.schema,
			...badgeCopy
		})
	])
);
export type BadgeDefinition = ReturnType<typeof BadgeDefinition>;

/**
 * The `(profile, role)` completion key a badge is claimed against — the pair
 * `membershipsOfProfile` / `evaluateCompletion` take.
 *
 * `base` and `complete` key to the **base** profile: they differ only in *which
 * sub-set of it* their tier scores, so the base badge never changes meaning when
 * the optional (Complete) set grows — different tier, different sub-set, same
 * key. `additive` keys to the additive profile. Applying the sub-set within the
 * key is the tier's job, done in `scenariosBehindBadge`.
 */
export function badgeKey(badge: BadgeDefinition): {
	profile: ProfileSlug | AdditiveProfileSlug;
	role: RoleSlug;
} {
	return {
		profile: badge.tier === 'additive' ? badge.additiveProfile : badge.baseProfile,
		role: badge.role
	};
}

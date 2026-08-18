import { z } from 'zod';

import { AdditiveProfileSlug } from '$lib/interop/additive-profile-schema.js';
import { ProfileSlug, RoleSlug } from '$lib/interop/profile-schema.js';
import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * A badge names a **completion set** and turns it into a claimable recognition
 * credential. Its identity is the `(base profile | additive, role)` key the
 * meter already counts over — not a persona, not a product name.
 *
 * Two things are deliberately kept apart here:
 *
 * - **Domain** — `slug`, `tier`, `baseProfile`, `additive`, `role`, and the
 *   `(base, additive, role)` key. These decide *what set* a badge is claimed
 *   against and never enter presentation.
 * - **Presentation** — `name` and `criteriaSummary`. Copy only, and therefore
 *   **excluded from the badge fingerprint** (`badge-fingerprint.ts`), so
 *   rewording a badge's name never invalidates a claim.
 */
export const BadgeTier = ZodFactory(z.enum(['base', 'complete']));
export type BadgeTier = ReturnType<typeof BadgeTier>;

export const BadgeDefinition = ZodFactory(
	z.object({
		/** e.g. `oid4-wallet`. Kebab. Names the badge and the `/badges/[slug]` route. */
		slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
		tier: BadgeTier.schema,
		/** The base profile whose set this badge is claimed against. */
		baseProfile: ProfileSlug.schema,
		/** Present on a `complete` badge — it is claimed against the additive's set instead. */
		additive: AdditiveProfileSlug.schema.optional(),
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
	})
);
export type BadgeDefinition = ReturnType<typeof BadgeDefinition>;

/**
 * The completion key a badge is claimed against — the `(base | additive, role)`
 * pair `evaluateCompletion`/`scenariosFor` take.
 *
 * Returns the **additive when present**: a `— Complete` badge is claimed against
 * the additive's set, and the base badge (no additive) against the base
 * profile's. The two are different keys, different sets, different badges — which
 * is what keeps the base badge from changing meaning when an additive exists.
 */
export function badgeKey(badge: BadgeDefinition): {
	profile: ProfileSlug | AdditiveProfileSlug;
	role: RoleSlug;
} {
	return { profile: badge.additive ?? badge.baseProfile, role: badge.role };
}

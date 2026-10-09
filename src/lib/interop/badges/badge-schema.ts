import { z } from 'zod';

import { AdditiveProfileSlug } from '$lib/interop/additive-profile-schema.js';
import { ProfileSlug, RoleSlug } from '$lib/interop/profile-schema.js';
import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * A badge names a **completion sub-set** and turns it into a claimable
 * recognition credential.
 *
 * **A badge is never one scenario.** It is a logical group of work within a
 * profile-role, so its identity is a completion key plus the tier that decides
 * which sub-set within that key it scores — not a persona, not a product name.
 *
 * Three tiers:
 *
 * - `essential` — the `required` scenarios of a **base** profile-role. The
 *   everyday badge, e.g. "VCALM Wallet — Essential".
 * - `expanded` — **cumulative**: that same Essential floor plus the base
 *   profile's own `optional` set. A second, distinct badge for an implementer
 *   who covers the profile-role fully.
 * - `add-on` — an additive profile's work **within one base profile and role**,
 *   e.g. "Data Integrity Cryptosuites — VCALM Wallet". Single-tier, and
 *   **gated on the Essential badge of the base profile-role it layers on**.
 *
 * **An add-on badge is keyed `(additive, base profile, role)`, not
 * `(additive, role)`.** It spanned every base profile until M15, which made a
 * card unable to express its own obligation: `evaluateAdditiveSlice` scopes an
 * additive's work to one base profile, so a spanning badge had no honest
 * rendering anywhere except the additive's own page. Now the slice **is** the
 * badge key, and *DIC VCALM Wallet* and *DIC OID4 Wallet* are different badges
 * that name their protocol. See
 * `docs/adr/2026-08-21-additive-requirements-as-memberships.md` and its M15
 * successor.
 *
 * Two things are deliberately kept apart:
 *
 * - **Domain** — `slug`, `tier`, the profile (`baseProfile` / `additiveProfile`)
 *   and `role`: the completion set a badge is claimed against. These never enter
 *   presentation.
 * - **Presentation** — `name`, `description`, `criteriaSummary`. Copy only, and
 *   therefore **excluded from the badge fingerprint** (`badge-fingerprint.ts`),
 *   so rewording a badge's name never invalidates a claim.
 */
export const BadgeTier = ZodFactory(z.enum(['essential', 'expanded', 'add-on']));
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
		// Essential and Expanded both key to a base profile-role; the tier picks the
		// required floor (essential) or that floor plus its optional set (expanded).
		z.object({ tier: z.literal('essential'), baseProfile: ProfileSlug.schema, ...badgeCopy }),
		z.object({ tier: z.literal('expanded'), baseProfile: ProfileSlug.schema, ...badgeCopy }),
		// An add-on badge names BOTH profiles: the additive whose work it scores and
		// the base profile that work ran over. Both are needed — the pair is the key.
		z.object({
			tier: z.literal('add-on'),
			additiveProfile: AdditiveProfileSlug.schema,
			baseProfile: ProfileSlug.schema,
			...badgeCopy
		})
	])
);
export type BadgeDefinition = ReturnType<typeof BadgeDefinition>;

/**
 * The completion key a badge is claimed against — the pair
 * `membershipsOfProfile` / `evaluateCompletion` take.
 *
 * `essential` and `expanded` key to the **base** profile: they differ only in
 * *which sub-set of it* their tier scores, so the Essential badge never changes
 * meaning when the Expanded set grows — different tier, different sub-set, same
 * key. `add-on` keys to the **additive** profile, and is additionally scoped to
 * one base profile by {@link addOnBaseProfileOf}; applying the sub-set within
 * the key is the tier's job, done in `scenariosBehindBadge`.
 */
export function badgeKey(badge: BadgeDefinition): {
	profile: ProfileSlug | AdditiveProfileSlug;
	role: RoleSlug;
} {
	return {
		profile: badge.tier === 'add-on' ? badge.additiveProfile : badge.baseProfile,
		role: badge.role
	};
}

/**
 * The base profile an **add-on** badge's work must have run over, or `undefined`
 * for the two base tiers, whose `baseProfile` is already the completion key.
 *
 * This is the half of an add-on badge's key that `badgeKey` cannot carry: the
 * key names the additive so `membershipsOfProfile` finds the right memberships,
 * and this narrows them to one protocol. Splitting it out keeps `badgeKey`'s
 * shape identical for all three tiers.
 */
export function addOnBaseProfileOf(badge: BadgeDefinition): ProfileSlug | undefined {
	return badge.tier === 'add-on' ? badge.baseProfile : undefined;
}

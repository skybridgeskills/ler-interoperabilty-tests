import { allBadgeDefinitions } from './badge-definitions.js';
import { type BadgeDefinition, badgeKey } from './badge-schema.js';

/**
 * The badge registry, keyed by slug.
 *
 * The definitions themselves live in `badge-definitions.ts`, hand-written; this
 * is only the index. `badge.test.ts` asserts the set matches the catalog — every
 * renderable `(profile, role)` group has a badge, and no badge names an empty
 * scenario set — so the registry cannot drift behind the catalog the way it did
 * between M8 and M15, when it held two badges against a catalog of thirty-two
 * scenarios and every add-on card's claim control was dead.
 */
export const badgeDefinitions: Record<string, BadgeDefinition> = Object.fromEntries(
	allBadgeDefinitions.map((badge) => [badge.slug, badge])
);

/** The badge for a slug, or `undefined`. The caller (route, endpoint) makes the typed 404. */
export function badgeBySlug(slug: string): BadgeDefinition | undefined {
	return badgeDefinitions[slug];
}

/** Every registered slug, in display order — for prerender entries and tests. */
export function allBadgeSlugs(): string[] {
	return Object.keys(badgeDefinitions);
}

/**
 * The **Essential** badge for a base profile-role — the everyday one, claimed
 * against that profile-role's `required` floor.
 *
 * Returns `undefined` when none is registered, and the caller leaves its claim
 * control off. It also returns `undefined` for an **additive** slug, which is
 * correct rather than a gap: since M15 an additive has no single badge spanning
 * its base profiles — it has one per base profile, found with
 * {@link addOnBadgeFor}.
 */
export function essentialBadgeFor(profile: string, role: string): BadgeDefinition | undefined {
	return Object.values(badgeDefinitions).find(
		(b) => b.tier === 'essential' && badgeKey(b).profile === profile && b.role === role
	);
}

/**
 * The **Expanded** badge for a base profile-role, if one is registered.
 * `undefined` for an additive profile, or for a base profile whose Expanded tier
 * has no badge yet — the caller then renders no Expanded affordance.
 */
export function expandedBadgeFor(profile: string, role: string): BadgeDefinition | undefined {
	return Object.values(badgeDefinitions).find(
		(b) => b.tier === 'expanded' && badgeKey(b).profile === profile && b.role === role
	);
}

/**
 * The **add-on** badge for one additive's work within one base profile and role.
 *
 * All three parts are needed because that triple is the key: *DIC VCALM Wallet*
 * and *DIC OID4 Wallet* are different badges, and looking one up by
 * `(additive, role)` alone could only ever return an arbitrary one of them.
 */
export function addOnBadgeFor(
	additiveProfile: string,
	baseProfile: string,
	role: string
): BadgeDefinition | undefined {
	return Object.values(badgeDefinitions).find(
		(b) =>
			b.tier === 'add-on' &&
			b.additiveProfile === additiveProfile &&
			b.baseProfile === baseProfile &&
			b.role === role
	);
}

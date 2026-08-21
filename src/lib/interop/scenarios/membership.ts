import { z } from 'zod';

import { AdditiveProfileSlug } from '$lib/interop/additive-profile-schema.js';
import { ProfileSlug } from '$lib/interop/profile-schema.js';
import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * The name of a `oneOf` alternatives group, scoped to the scenario catalog.
 *
 * A group is the **producer-floor** primitive: "pass EdDSA *or* ECDSA". Consumer
 * breadth is instead several `required` memberships in an additive, which is
 * what keeps selective disclosure (BBS+, `ecdsa-sd` — a separate set) off the
 * core floor.
 */
export const OneOfGroup = ZodFactory(z.string().min(1));
export type OneOfGroup = ReturnType<typeof OneOfGroup>;

/**
 * How strongly a profile depends on a scenario.
 *
 * - `required` — counts toward that profile's Essential meter, and must pass
 *   before its badge is claimable.
 * - `optional` — **excluded from the Essential meter entirely**; it is the
 *   profile's Expanded set, rendered as its own section with its own count.
 *   Including expanded work in the Essential meter would mean that meter can
 *   never fill.
 * - `{ oneOf }` — one obligation shared with the group's other members. They
 *   stop gating once any one of them passes.
 * - `additive-only` — the profile **names** this scenario, because it is the
 *   delivery protocol the scenario runs over, and claims **none** of it: it
 *   counts toward neither the profile's Essential meter nor its Complete meter.
 *   Only a *base* membership may take this level, and only for a scenario at
 *   least one **additive** profile claims. It is what keeps add-on work — a
 *   cryptosuite bundle, skill alignment — out of a base profile's own tiers, so
 *   that "a complete OID4 wallet" does not silently come to mean "…and does
 *   skill alignment too". Not every implementer wants an add-on's work, and a
 *   denominator they cannot opt out of would make Complete unreachable for them.
 */
export const MembershipLevel = ZodFactory(
	z.union([
		z.literal('required'),
		z.literal('optional'),
		z.literal('additive-only'),
		z.object({ oneOf: OneOfGroup.schema })
	])
);
export type MembershipLevel = ReturnType<typeof MembershipLevel>;

/**
 * One profile's claim on a scenario.
 *
 * **The level belongs to the membership, not to the scenario.** The same
 * scenario — "accept an ECDSA-signed credential over OID4" — is `additive-only`
 * in the `oid4` base profile and `required` in the
 * `data-integrity-cryptosuites` additive: OID4 fixes no cryptosuite of its own,
 * so it hosts the scenario without claiming it, while the bundle requires every
 * consumer to verify both of its options. A base profile that *did* mandate
 * that cryptosuite would name the same scenario `required` instead — the level
 * is an authoring choice made per membership, not a property of the scenario. A
 * profile, base or additive, is therefore just a named, versioned set of
 * memberships, derived by inverting the catalog rather than declared on the
 * profile.
 *
 * Exactly one of a scenario's memberships names a **base** profile — the
 * delivery protocol. Any number may name additives.
 */
export const Membership = ZodFactory(
	z.object({
		profile: z.union([ProfileSlug.schema, AdditiveProfileSlug.schema]),
		level: MembershipLevel.schema
	})
);
export type Membership = ReturnType<typeof Membership>;

/**
 * The base profile a set of memberships names, or `undefined` when it names
 * none. Catalog validation rejects a scenario that names zero or more than one.
 */
export function baseProfileOf(memberships: Membership[]): ProfileSlug | undefined {
	const bases = memberships.filter((m) => isBaseProfile(m.profile));
	return bases.length === 1 ? (bases[0].profile as ProfileSlug) : undefined;
}

/** Every base profile named by a set of memberships — used to detect zero or many. */
export function baseProfilesOf(memberships: Membership[]): ProfileSlug[] {
	return memberships.filter((m) => isBaseProfile(m.profile)).map((m) => m.profile as ProfileSlug);
}

/** Whether a membership's profile slug names a base profile rather than an additive. */
export function isBaseProfile(profile: Membership['profile']): boolean {
	return ProfileSlug.schema.safeParse(profile).success;
}

/** The `oneOf` group a membership belongs to, or `undefined` for `required`/`optional`. */
export function oneOfGroupOf(level: MembershipLevel): OneOfGroup | undefined {
	return typeof level === 'object' ? level.oneOf : undefined;
}

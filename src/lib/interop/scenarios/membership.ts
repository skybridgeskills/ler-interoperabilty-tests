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
 * - `required` — counts toward that profile's base meter, and must pass before
 *   its badge is claimable.
 * - `optional` — **excluded from the base meter entirely**; it renders as its
 *   own sub-section with its own meter. Including optional work in the base
 *   meter would mean the meter can never fill.
 * - `{ oneOf }` — one obligation shared with the group's other members. They
 *   stop gating once any one of them passes.
 */
export const MembershipLevel = ZodFactory(
	z.union([z.literal('required'), z.literal('optional'), z.object({ oneOf: OneOfGroup.schema })])
);
export type MembershipLevel = ReturnType<typeof MembershipLevel>;

/**
 * One profile's claim on a scenario.
 *
 * **The level belongs to the membership, not to the scenario.** The same
 * scenario — "accept an ECDSA credential over OID4" — is `optional` in the
 * `oid4` base profile and `required` in the `data-integrity-cryptosuites`
 * additive. A profile, base or additive, is therefore just a named, versioned
 * set of memberships, derived by inverting the catalog rather than declared on
 * the profile.
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

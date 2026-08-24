import { z } from 'zod';

import { AdditiveProfileSlug } from '$lib/interop/additive-profile-schema.js';
import { ProfileSlug } from '$lib/interop/profile-schema.js';
import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * The name of a `oneOf` alternatives group, scoped to the scenario catalog.
 *
 * **No scenario uses this as of M15, and that is deliberate.** M11 and M12
 * authored seven cross-protocol groups — the same additive item completing over
 * VCALM or OID4 — to serve an add-on badge keyed `(additive, role)` that spanned
 * every base profile. M15 re-keyed that badge to
 * `(additive, base profile, role)`, at which point a group inside one base
 * profile's slice had exactly one member: arithmetically correct, expressing
 * nothing. The groups were dropped and those memberships became plain
 * `required`.
 *
 * The primitive **stays**, dormant. It costs nothing, catalog rule 5
 * (`oneOfGroupsAgree`) still guards it so a future group cannot drift, and
 * deleting it would make re-adding it a schema change. A genuine "any one of
 * these alternatives" obligation is still expressible; there simply is not one
 * in the catalog today.
 *
 * Before reaching for it, read
 * `docs/adr/2026-08-21-additive-requirements-as-memberships.md` and its M15
 * amendment — the cross-protocol use is **withdrawn**, not merely unused.
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
 *   stop gating once any one of them passes. **Dormant since M15** — see
 *   {@link OneOfGroup} for why no scenario uses it.
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

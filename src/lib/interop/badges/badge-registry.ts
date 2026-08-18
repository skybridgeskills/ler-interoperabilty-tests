import { BadgeDefinition, badgeKey } from './badge-schema.js';

/**
 * The base `oid4-wallet` badge — awarded for a full `(oid4, wallet)` required
 * set. Its `(base, additive, role)` key is `(oid4, —, wallet)`.
 */
const oid4Wallet = BadgeDefinition({
	slug: 'oid4-wallet',
	tier: 'base',
	baseProfile: 'oid4',
	role: 'wallet',
	name: 'OID4 Wallet',
	description:
		'Recognition for demonstrating OID4 wallet conformance in the LER Interoperability Test Suite: accepting a well-formed Open Badges 3.0 credential over OID4VCI and correctly refusing an expired or tampered one.',
	criteriaSummary:
		'Awarded for passing the OID4 Wallet conformance scenarios in the LER Interoperability Test Suite — every required conformance requirement for the OID4 wallet role, across credential acceptance and refusal/discrimination, self-verified against a live wallet.'
});

/**
 * The badge registry, keyed by slug.
 *
 * **Only `oid4-wallet` is registered.** The two-tier `(base, additive)`
 * mechanism is built (see {@link badgeKey}), but `oid4-wallet-complete` is
 * intentionally NOT here — no optional/additive scenario exists yet, so its set
 * would be empty. Register the second tier when one does (see plan D5).
 */
export const badgeDefinitions: Record<string, BadgeDefinition> = {
	[oid4Wallet.slug]: oid4Wallet
};

/** The badge for a slug, or `undefined`. The caller (route, endpoint) makes the typed 404. */
export function badgeBySlug(slug: string): BadgeDefinition | undefined {
	return badgeDefinitions[slug];
}

/** Every registered badge slug. */
export function allBadgeSlugs(): string[] {
	return Object.keys(badgeDefinitions);
}

/**
 * The badge registered for a completion key, if any. A group with no badge (e.g.
 * `oid4/issuer`) returns `undefined` — the caller leaves its claim control off.
 */
export function badgeFor(profile: string, role: string): BadgeDefinition | undefined {
	return Object.values(badgeDefinitions).find(
		(b) => badgeKey(b).profile === profile && b.role === role
	);
}

import { BadgeDefinition, badgeKey } from './badge-schema.js';

/**
 * The base `oid4-wallet` badge — awarded for the full `(oid4, wallet)` **required**
 * set (the Core tier). Its completion key is `(oid4, wallet)`; its tier scopes it
 * to that profile-role's required scenarios (see `scenariosBehindBadge`).
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
 * The `oid4-wallet-complete` badge — the Expanded tier of the same `(oid4,
 * wallet)` bundle, claimed against that base profile's **`optional`** set (its
 * tier scopes it there; see `scenariosBehindBadge`). A distinct, second badge for
 * an implementer who covers the profile-role fully, not an upgrade of the base.
 */
const oid4WalletComplete = BadgeDefinition({
	slug: 'oid4-wallet-complete',
	tier: 'complete',
	baseProfile: 'oid4',
	role: 'wallet',
	name: 'OID4 Wallet — Complete',
	description:
		'Recognition for demonstrating complete OID4 wallet conformance in the LER Interoperability Test Suite: beyond accepting and refusing credentials, faithfully rendering a fully-decorated Open Badges 3.0 credential — its image, achievement and issuer — as the operator sees it.',
	criteriaSummary:
		'Awarded for passing the expanded OID4 Wallet scenarios in the LER Interoperability Test Suite — the optional, beyond-core conformance requirements for the OID4 wallet role, self-verified against a live wallet.'
});

/**
 * The badge registry, keyed by slug.
 *
 * The `(oid4, wallet)` bundle registers **both** tiers: `oid4-wallet` (base,
 * required set) and `oid4-wallet-complete` (complete, the same profile's optional
 * set). Additive badges stay unregistered (dormant) until additive scenarios
 * exist — they gain the single-tier shape here without a home yet.
 */
export const badgeDefinitions: Record<string, BadgeDefinition> = {
	[oid4Wallet.slug]: oid4Wallet,
	[oid4WalletComplete.slug]: oid4WalletComplete
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
 * The **primary** badge for a completion group — the `base` badge of a base
 * profile-role, or the `additive` badge of an additive profile-role. This is the
 * Core / single-tier affordance a group renders on top; the expanded Complete
 * badge is {@link completeBadgeFor}. Returns `undefined` when no such badge is
 * registered (e.g. `oid4/issuer`), and the caller leaves its claim control off.
 */
export function badgeFor(profile: string, role: string): BadgeDefinition | undefined {
	return Object.values(badgeDefinitions).find(
		(b) => b.tier !== 'complete' && badgeKey(b).profile === profile && b.role === role
	);
}

/**
 * The `complete` (expanded) badge for a base profile-role, if one is registered.
 * `undefined` for an additive profile, or a base profile whose Complete tier has
 * no badge yet — the caller then renders no Complete affordance.
 */
export function completeBadgeFor(profile: string, role: string): BadgeDefinition | undefined {
	return Object.values(badgeDefinitions).find(
		(b) => b.tier === 'complete' && badgeKey(b).profile === profile && b.role === role
	);
}

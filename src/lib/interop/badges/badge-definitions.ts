import { BadgeDefinition } from './badge-schema.js';

/**
 * Every badge the suite awards, hand-written.
 *
 * **The set is derived; the words are not.** `badge.test.ts` asserts that every
 * `(profile, role)` group the app can render has a badge here, and that no badge
 * names an empty scenario set — so the registry cannot drift behind the catalog.
 * The copy itself is written once per badge, deliberately: it ends up in the
 * `Achievement.description` and `criteria.narrative` of a real credential in
 * someone's wallet, and a generated sentence would read like one.
 *
 * Three tiers, and the slug says which:
 *
 * - `<base>-<role>-essential` — that profile-role's `required` floor.
 * - `<base>-<role>-expanded` — cumulative: the floor plus its own `optional` set.
 *   Registered **only** where that optional set is non-empty; an Expanded badge
 *   over nothing would be claimable the instant its Essential was.
 * - `<additive>-<base>-<role>` — one additive's work over one protocol, gated on
 *   that profile-role's Essential badge. The additive's full slug is used rather
 *   than an abbreviation, so the slug and `addOnBadgeFor`'s first argument read
 *   the same.
 *
 * Every description says **self-verified**: these are self-attested, and the copy
 * must not imply an audit.
 */

/** Shorthand: the same three copy fields, in the order every definition uses them. */
type Copy = { name: string; description: string; criteriaSummary: string };

const essential = (
	baseProfile: 'vcalm' | 'oid4' | 'ob3-direct-delivery',
	role: 'issuer' | 'wallet' | 'verifier',
	copy: Copy
) =>
	BadgeDefinition({
		slug: `${baseProfile}-${role}-essential`,
		tier: 'essential',
		baseProfile,
		role,
		...copy
	});

const expanded = (
	baseProfile: 'vcalm' | 'oid4' | 'ob3-direct-delivery',
	role: 'issuer' | 'wallet' | 'verifier',
	copy: Copy
) =>
	BadgeDefinition({
		slug: `${baseProfile}-${role}-expanded`,
		tier: 'expanded',
		baseProfile,
		role,
		...copy
	});

const addOn = (
	additiveProfile: 'data-integrity-cryptosuites' | 'open-skill-alignment',
	baseProfile: 'vcalm' | 'oid4' | 'ob3-direct-delivery',
	role: 'issuer' | 'wallet' | 'verifier',
	copy: Copy
) =>
	BadgeDefinition({
		slug: `${additiveProfile}-${baseProfile}-${role}`,
		tier: 'add-on',
		additiveProfile,
		baseProfile,
		role,
		...copy
	});

// --- Essential ---------------------------------------------------------------

const vcalmWallet = essential('vcalm', 'wallet', {
	name: 'VCALM Wallet — Essential',
	description:
		'Recognition for demonstrating VCALM wallet conformance in the LER Interoperability Test Suite: accepting a well-formed Open Badges 3.0 credential over a VC-API exchange, correctly refusing an expired or tampered one, and presenting a credential back to a verifier.',
	criteriaSummary:
		'Awarded for passing every required VCALM wallet scenario in the LER Interoperability Test Suite — credential acceptance, refusal discrimination and presentation — self-verified against a live wallet.'
});

const oid4Wallet = essential('oid4', 'wallet', {
	name: 'OID4 Wallet — Essential',
	description:
		'Recognition for demonstrating OID4 wallet conformance in the LER Interoperability Test Suite: accepting a well-formed Open Badges 3.0 credential over OID4VCI, correctly refusing an expired or tampered one, and presenting a credential over OID4VP.',
	criteriaSummary:
		'Awarded for passing every required OID4 wallet scenario in the LER Interoperability Test Suite — credential acceptance, refusal discrimination and presentation — self-verified against a live wallet.'
});

const vcalmIssuer = essential('vcalm', 'issuer', {
	name: 'VCALM Issuer — Essential',
	description:
		'Recognition for demonstrating VCALM issuer conformance in the LER Interoperability Test Suite: issuing a well-formed, correctly signed Open Badges 3.0 credential over a VC-API exchange, bound to the holder that authenticated for it.',
	criteriaSummary:
		'Awarded for passing every required VCALM issuer scenario in the LER Interoperability Test Suite, self-verified against a live issuer.'
});

const oid4Issuer = essential('oid4', 'issuer', {
	name: 'OID4 Issuer — Essential',
	description:
		'Recognition for demonstrating OID4 issuer conformance in the LER Interoperability Test Suite: issuing a well-formed, correctly signed Open Badges 3.0 credential over OID4VCI, bound to the holder whose key proof it verified.',
	criteriaSummary:
		'Awarded for passing every required OID4 issuer scenario in the LER Interoperability Test Suite, self-verified against a live issuer.'
});

const ob3DirectIssuer = essential('ob3-direct-delivery', 'issuer', {
	name: 'OB 3.0 Direct Delivery Issuer — Essential',
	description:
		'Recognition for demonstrating direct-delivery issuer conformance in the LER Interoperability Test Suite: issuing a well-formed, correctly signed Open Badges 3.0 credential delivered as a file or pasted text, with no exchange protocol.',
	criteriaSummary:
		'Awarded for passing every required direct-delivery issuer scenario in the LER Interoperability Test Suite, self-verified against a live issuer.'
});

const vcalmVerifier = essential('vcalm', 'verifier', {
	name: 'VCALM Verifier — Essential',
	description:
		'Recognition for demonstrating VCALM verifier conformance in the LER Interoperability Test Suite: requesting a credential over a VC-API exchange, and telling a well-formed one from an expired, tampered or schema-invalid one.',
	criteriaSummary:
		'Awarded for passing every required VCALM verifier scenario in the LER Interoperability Test Suite — the request itself, and the accept/reject discrimination — self-verified against a live verifier.'
});

const oid4Verifier = essential('oid4', 'verifier', {
	name: 'OID4 Verifier — Essential',
	description:
		'Recognition for demonstrating OID4 verifier conformance in the LER Interoperability Test Suite: requesting a credential over OID4VP, and telling a well-formed one from an expired, tampered or schema-invalid one.',
	criteriaSummary:
		'Awarded for passing every required OID4 verifier scenario in the LER Interoperability Test Suite — the request itself, and the accept/reject discrimination — self-verified against a live verifier.'
});

const ob3DirectVerifier = essential('ob3-direct-delivery', 'verifier', {
	name: 'OB 3.0 Direct Delivery Verifier — Essential',
	description:
		'Recognition for demonstrating direct-delivery verifier conformance in the LER Interoperability Test Suite: telling a well-formed Open Badges 3.0 credential from an expired, tampered or schema-invalid one, handed over as a file with no exchange protocol.',
	criteriaSummary:
		'Awarded for passing the required direct-delivery verifier discrimination scenario in the LER Interoperability Test Suite, self-verified against a live verifier.'
});

// --- Expanded ----------------------------------------------------------------

const oid4WalletExpanded = expanded('oid4', 'wallet', {
	name: 'OID4 Wallet — Expanded',
	description:
		'Recognition for demonstrating expanded OID4 wallet conformance in the LER Interoperability Test Suite: beyond accepting and refusing credentials, faithfully rendering a fully-decorated Open Badges 3.0 credential, answering a Presentation Exchange request, handling a request for partial disclosure, and discovering issuer metadata as RFC 8414 specifies.',
	criteriaSummary:
		'Awarded for passing every OID4 wallet scenario in the LER Interoperability Test Suite — the required set and the expanded set together — self-verified against a live wallet.'
});

// --- Add-on: Data Integrity Cryptosuites -------------------------------------

const DIC_ISSUER = (protocol: string, extra: string) => ({
	description: `Recognition for demonstrating both Data Integrity cryptosuites as a ${protocol} issuer in the LER Interoperability Test Suite: signing Open Badges 3.0 credentials with eddsa-rdfc-2022 and with ecdsa-rdfc-2019${extra}.`,
	criteriaSummary: `Awarded for passing every Data Integrity Cryptosuites issuer scenario over ${protocol} in the LER Interoperability Test Suite, on top of that profile's Essential badge, self-verified against a live issuer.`
});

const dicVcalmIssuer = addOn('data-integrity-cryptosuites', 'vcalm', 'issuer', {
	name: 'Data Integrity Cryptosuites — VCALM Issuer',
	...DIC_ISSUER('VCALM', ', and verifying a holder key proof in each of them')
});

const dicOid4Issuer = addOn('data-integrity-cryptosuites', 'oid4', 'issuer', {
	name: 'Data Integrity Cryptosuites — OID4 Issuer',
	...DIC_ISSUER('OID4', ', and verifying a `di_vp` key proof in each of them')
});

const dicOb3DirectIssuer = addOn('data-integrity-cryptosuites', 'ob3-direct-delivery', 'issuer', {
	name: 'Data Integrity Cryptosuites — OB 3.0 Direct Delivery Issuer',
	...DIC_ISSUER('direct-delivery', '')
});

const DIC_WALLET = (protocol: string, presentation: string) => ({
	description: `Recognition for demonstrating both Data Integrity cryptosuites as a ${protocol} wallet in the LER Interoperability Test Suite: verifying credentials signed with eddsa-rdfc-2022 and with ecdsa-rdfc-2019, and presenting over ${presentation} with a holder key of each type.`,
	criteriaSummary: `Awarded for passing every Data Integrity Cryptosuites wallet scenario over ${protocol} in the LER Interoperability Test Suite, on top of that profile's Essential badge, self-verified against a live wallet.`
});

const dicVcalmWallet = addOn('data-integrity-cryptosuites', 'vcalm', 'wallet', {
	name: 'Data Integrity Cryptosuites — VCALM Wallet',
	...DIC_WALLET('VCALM', 'VCALM')
});

const dicOid4Wallet = addOn('data-integrity-cryptosuites', 'oid4', 'wallet', {
	name: 'Data Integrity Cryptosuites — OID4 Wallet',
	...DIC_WALLET('OID4', 'OID4VP')
});

const DIC_VERIFIER = (protocol: string) => ({
	description: `Recognition for demonstrating both Data Integrity cryptosuites as a ${protocol} verifier in the LER Interoperability Test Suite: accepting a well-formed credential signed with eddsa-rdfc-2022 and with ecdsa-rdfc-2019, and rejecting one of each whose proof was corrupted after signing.`,
	criteriaSummary: `Awarded for passing every Data Integrity Cryptosuites verifier scenario over ${protocol} in the LER Interoperability Test Suite, on top of that profile's Essential badge, self-verified against a live verifier.`
});

const dicVcalmVerifier = addOn('data-integrity-cryptosuites', 'vcalm', 'verifier', {
	name: 'Data Integrity Cryptosuites — VCALM Verifier',
	...DIC_VERIFIER('VCALM')
});

const dicOid4Verifier = addOn('data-integrity-cryptosuites', 'oid4', 'verifier', {
	name: 'Data Integrity Cryptosuites — OID4 Verifier',
	...DIC_VERIFIER('OID4')
});

const dicOb3DirectVerifier = addOn(
	'data-integrity-cryptosuites',
	'ob3-direct-delivery',
	'verifier',
	{
		name: 'Data Integrity Cryptosuites — OB 3.0 Direct Delivery Verifier',
		...DIC_VERIFIER('direct-delivery')
	}
);

// --- Add-on: Open Skill Alignment --------------------------------------------

const OSA = (protocol: string) => ({
	description: `Recognition for demonstrating Open Skill Alignment as a ${protocol} issuer in the LER Interoperability Test Suite: issuing an Open Badges 3.0 credential that carries a performance scale and a learner result, aligned to a recognised skills registry.`,
	criteriaSummary: `Awarded for passing the Open Skill Alignment issuer scenario over ${protocol} in the LER Interoperability Test Suite, on top of that profile's Essential badge, self-verified against a live issuer.`
});

const osaVcalmIssuer = addOn('open-skill-alignment', 'vcalm', 'issuer', {
	name: 'Open Skill Alignment — VCALM Issuer',
	...OSA('VCALM')
});

const osaOid4Issuer = addOn('open-skill-alignment', 'oid4', 'issuer', {
	name: 'Open Skill Alignment — OID4 Issuer',
	...OSA('OID4')
});

const osaOb3DirectIssuer = addOn('open-skill-alignment', 'ob3-direct-delivery', 'issuer', {
	name: 'Open Skill Alignment — OB 3.0 Direct Delivery Issuer',
	...OSA('direct-delivery')
});

/** Every badge, in display order: Essential, then Expanded, then the add-ons. */
export const allBadgeDefinitions = [
	vcalmIssuer,
	vcalmWallet,
	vcalmVerifier,
	oid4Issuer,
	oid4Wallet,
	oid4Verifier,
	ob3DirectIssuer,
	ob3DirectVerifier,
	oid4WalletExpanded,
	dicVcalmIssuer,
	dicVcalmWallet,
	dicVcalmVerifier,
	dicOid4Issuer,
	dicOid4Wallet,
	dicOid4Verifier,
	dicOb3DirectIssuer,
	dicOb3DirectVerifier,
	osaVcalmIssuer,
	osaOid4Issuer,
	osaOb3DirectIssuer
];

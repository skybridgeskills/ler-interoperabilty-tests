import type { ProfileSlug } from '../../profile-schema.js';

/**
 * Identity + composition info for the data-integrity-cryptosuites
 * additive profile.
 *
 * The bundle declares two complete cryptosuite options. Producers of
 * credential proofs (issuer signing VCs, wallet signing VPs) MUST
 * support at least one option. Consumers of credential proofs (wallet
 * verifying issued VCs, verifier verifying VCs + VPs, issuer verifying
 * DID-auth VPs) MUST support every option.
 *
 * | Option | Cryptosuite       | Key type | DID methods      |
 * | ------ | ----------------- | -------- | ---------------- |
 * | EdDSA  | eddsa-rdfc-2022   | Ed25519  | did:web, did:key |
 * | ECDSA  | ecdsa-rdfc-2019   | P-256    | did:web, did:key |
 */
export const dataIntegrityCryptosuitesMeta = {
	id: 'data-integrity-cryptosuites-v1',
	slug: 'data-integrity-cryptosuites' as const,
	name: 'Data Integrity Cryptosuites',
	version: '0.1',
	status: "Editor's Draft",
	lastUpdated: '2026-05-16',
	description:
		'Additive profile that bundles two complete Data Integrity cryptosuite options for ' +
		'OB 3.0 credentials and the verifiable presentations that carry them: EdDSA ' +
		'(eddsa-rdfc-2022 + Ed25519) and ECDSA (ecdsa-rdfc-2019 + P-256). Issuer and holder ' +
		'identifiers MUST use did:web or did:key with a verification method matching the ' +
		'chosen cryptosuite. Producers (issuers signing credentials, wallets signing ' +
		'presentations) MUST support at least one option; consumers (verifiers — including ' +
		'issuers during DID-auth) MUST support every option in the bundle.',
	appliesToBaseProfiles: ['vcalm'] satisfies ProfileSlug[]
};

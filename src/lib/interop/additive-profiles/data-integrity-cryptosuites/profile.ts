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
 *
 * The bundle layers on the `vcalm` and `oid4` exchange profiles (across
 * their 4 shared workflows) and on the `ob3-direct-delivery` profile's
 * issuer direct-issuance operation (producer-only). Additive checklists
 * are matched to a base profile by (role, workflow), not by the
 * checklist's own `profile` field.
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
		'issuers during DID-auth) MUST support every option in the bundle. The same ' +
		'cryptosuites are what an OID4 issuer advertises as the di_vp ' +
		'proof_signing_alg_values_supported, so the bundle secures both the credential’s ' +
		'own Data Integrity proof and the key-proof verifiable presentation (OID4 di_vp / ' +
		'VCALM DIDAuthentication).',
	appliesToBaseProfiles: ['vcalm', 'oid4', 'ob3-direct-delivery'] satisfies ProfileSlug[]
};

import type { ProfileKeyComponent } from '../../profile-schema.js';

/**
 * Identity + key technical choices for the OID4 profile.
 *
 * The cryptosuite, key type, and DID-method choices are owned by the
 * `data-integrity-cryptosuites` additive profile (EdDSA / Ed25519 /
 * eddsa-rdfc-2022 or ECDSA / P-256 / ecdsa-rdfc-2019). The base profile
 * here is cryptosuite-neutral.
 */
export const oid4ProfileMeta = {
	id: 'oid4-v1',
	slug: 'oid4' as const,
	name: 'OID4 Profile',
	version: '0.2',
	status: "Editor's Draft",
	url: 'https://interoperability.learningmobilitycollaborative.org/profiles/oid4-ecdsa/',
	lastUpdated: '2026-06-10',
	description:
		'OAuth 2.0-based credential exchange using OID4VCI / OID4VP over Open Badges 3.0 ' +
		'credentials. The cryptosuite, key type, and DID-method options are declared by the ' +
		'data-integrity-cryptosuites additive profile.',
	keyComponents: [
		{ label: 'Exchange Protocols', value: 'OID4VCI v1.0 (issuance), OID4VP v1.0 (presentation)' },
		{
			label: 'OID4VP Presentation',
			value:
				'Unsigned request with the `redirect_uri` client_id scheme; DCQL query; `vp_token` returned via `direct_post`.'
		},
		{
			label: 'Cryptographic Suite',
			value: 'See data-integrity-cryptosuites additive (EdDSA or ECDSA)'
		},
		{
			label: 'Key Proof of Possession',
			value:
				'OID4VCI di_vp (Data Integrity VP) key proofs; proof_signing_alg_values_supported per the data-integrity-cryptosuites additive. JWT-only key proofs are out of profile.'
		},
		{ label: 'Credential Format', value: 'W3C Verifiable Credentials Data Model 2.0' },
		{ label: 'Credential Schema', value: 'Open Badges 3.0' },
		{ label: 'Status Method', value: 'Bitstring Status List' },
		{ label: 'DID Methods', value: 'did:web, did:key (key type per chosen cryptosuite)' },
		{ label: 'Recipient Identifiers', value: 'DID-based' }
	] satisfies ProfileKeyComponent[],
	useCases: [
		'OAuth 2.0-based credential exchange',
		'Enterprise credential management systems',
		'Mobile wallet applications',
		'Government-issued credentials'
	]
};

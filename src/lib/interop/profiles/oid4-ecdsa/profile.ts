import type { ProfileKeyComponent } from '../../profile-schema.js';

/** Identity + key technical choices for the OID4-ECDSA profile. */
export const oid4EcdsaProfileMeta = {
	id: 'oid4-ecdsa-v1',
	slug: 'oid4-ecdsa' as const,
	name: 'OID4-ECDSA Profile',
	version: '0.1',
	status: "Editor's Draft",
	lastUpdated: '2026-02-15',
	description:
		'OAuth 2.0-based credential exchange using OID4VCI / OID4VP with ECDSA signatures over Open Badges 3.0 credentials.',
	keyComponents: [
		{ label: 'Exchange Protocols', value: 'OID4VCI v1.0 (issuance), OID4VP v1.0 (presentation)' },
		{
			label: 'Cryptographic Suite',
			value: 'ecdsa-rdfc-2019 (ECDSA + RDF Dataset Canonicalization)'
		},
		{ label: 'Credential Format', value: 'W3C Verifiable Credentials Data Model 2.0' },
		{ label: 'Credential Schema', value: 'Open Badges 3.0' },
		{ label: 'Status Method', value: 'Bitstring Status List' },
		{ label: 'DID Methods', value: 'did:web, did:key' },
		{ label: 'Recipient Identifiers', value: 'DID-based' }
	] satisfies ProfileKeyComponent[],
	useCases: [
		'OAuth 2.0-based credential exchange',
		'Enterprise credential management systems',
		'Mobile wallet applications',
		'Government-issued credentials'
	]
};

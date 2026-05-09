import type { ProfileKeyComponent } from '../../profile-schema.js';

/** Identity + key technical choices for the OB 3.0 Direct Delivery profile. */
export const ob3DirectDeliveryProfileMeta = {
	id: 'ob3-direct-delivery-v1',
	slug: 'ob3-direct-delivery' as const,
	name: 'OB 3.0 Direct Delivery Profile',
	version: '0.1',
	status: "Editor's Draft",
	lastUpdated: '2026-02-15',
	description:
		'Direct credential issuance and verification using EdDSA-signed Open Badges 3.0 credentials delivered as JSON files or copy-paste text, without an exchange protocol. Recipient identifiers are email addresses.',
	keyComponents: [
		{ label: 'Exchange Protocol', value: 'None (direct file download / copy-paste)' },
		{
			label: 'Cryptographic Suite',
			value: 'eddsa-rdfc-2022 (EdDSA + RDF Dataset Canonicalization)'
		},
		{ label: 'Credential Format', value: 'W3C Verifiable Credentials Data Model 2.0' },
		{ label: 'Credential Schema', value: 'Open Badges 3.0' },
		{ label: 'Status Method', value: 'Bitstring Status List' },
		{ label: 'DID Methods (issuer)', value: 'did:web, did:key' },
		{ label: 'Recipient Identifiers', value: 'Email-based (per Open Badges 3.0 spec)' }
	] satisfies ProfileKeyComponent[],
	useCases: [
		'Direct credential download and file sharing',
		'Email-based credential delivery',
		'Copy-paste credential workflows',
		'Simple credential issuance without wallet integration'
	],
	notes: [
		'Recipients may lose access to the email address bound to a credential — for example, college email accounts often deactivate within ~6 months of graduation, and former employer addresses are typically inaccessible after employment ends. Strong proof of control may not be possible in those cases.',
		'When strong proof of control is required, prefer a profile that uses verifiable presentations.'
	]
};

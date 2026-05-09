import type { ProfileKeyComponent } from '../../profile-schema.js';

/** Identity + key technical choices for the VCALM-EdDSA profile. */
export const vcalmEddsaProfileMeta = {
	id: 'vcalm-eddsa-v1',
	slug: 'vcalm-eddsa' as const,
	name: 'VCALM-EdDSA Profile',
	version: '0.1',
	status: "Editor's Draft",
	lastUpdated: '2026-02-15',
	description:
		'Browser-based credential exchange using VCALM Exchanges with EdDSA signatures over Open Badges 3.0 credentials.',
	keyComponents: [
		{ label: 'Exchange Protocol', value: 'VCALM Exchanges' },
		{
			label: 'Cryptographic Suite',
			value: 'eddsa-rdfc-2022 (EdDSA + RDF Dataset Canonicalization)'
		},
		{ label: 'Credential Format', value: 'W3C Verifiable Credentials Data Model 2.0' },
		{ label: 'Credential Schema', value: 'Open Badges 3.0' },
		{ label: 'Status Method', value: 'Bitstring Status List' },
		{ label: 'DID Methods', value: 'did:web, did:key' },
		{ label: 'Recipient Identifiers', value: 'DID-based' }
	] satisfies ProfileKeyComponent[],
	useCases: [
		'Browser-based credential exchange',
		'Educational credential issuance and verification',
		'Skills-based hiring workflows',
		'Cross-institutional credential transfer'
	]
};

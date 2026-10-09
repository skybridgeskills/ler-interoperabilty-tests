import type { ProfileKeyComponent } from '../../profile-schema.js';
import type { StandardCitation } from '../../standards.js';

/**
 * Identity + key technical choices for the VCALM profile.
 *
 * The cryptosuite, key type, and DID-method choices are owned by the
 * `data-integrity-cryptosuites` additive profile so that issuers,
 * wallets, and verifiers can opt into either of the bundle's complete
 * options (EdDSA / Ed25519 / eddsa-rdfc-2022 or ECDSA / P-256 /
 * ecdsa-rdfc-2019). The base profile here is cryptosuite-neutral.
 */
export const vcalmProfileMeta = {
	id: 'vcalm-v1',
	slug: 'vcalm' as const,
	name: 'VCALM',
	version: '0.2',
	status: "Editor's Draft",
	url: 'https://interoperability.learningmobilitycollaborative.org/profiles/vcalm-eddsa/',
	lastUpdated: '2026-05-16',
	standards: [
		{ standard: 'vcalm-1' },
		{ standard: 'ob-3' },
		{ standard: 'vcdm-2' },
		{ standard: 'vc-di-1' },
		{ standard: 'bsl-1' },
		{ standard: 'did-core-1' },
		{ standard: 'did-web' },
		{ standard: 'did-key' },
		{ standard: 'cid-1', section: 'Multikey', label: '§2.2.2 Multikey' }
	] satisfies StandardCitation[],
	example: {
		builder: 'e.g. your product exchanges credentials in the browser over VCALM',
		evaluator: 'e.g. your partners exchange credentials over VCALM, so the vendor must too'
	},
	description:
		'Browser-based credential exchange using VCALM Exchanges over Open Badges 3.0 credentials. ' +
		'The cryptosuite, key type, and DID-method options are declared by the ' +
		'Data Integrity Cryptosuites add-on.',
	keyComponents: [
		{ label: 'Exchange Protocol', value: 'VCALM Exchanges' },
		{
			label: 'Cryptographic Suite',
			value: 'See the Data Integrity Cryptosuites add-on (EdDSA or ECDSA)'
		},
		{
			label: 'Key Proof of Possession',
			value:
				'DIDAuthentication verifiablePresentation secured with a Data Integrity proof (proofPurpose: authentication); cryptosuite per the Data Integrity Cryptosuites add-on.'
		},
		{ label: 'Credential Format', value: 'W3C Verifiable Credentials Data Model 2.0' },
		{ label: 'Credential Schema', value: 'Open Badges 3.0' },
		{ label: 'Status Method', value: 'Bitstring Status List' },
		{ label: 'DID Methods', value: 'did:web, did:key (key type per chosen cryptosuite)' },
		{ label: 'Recipient Identifiers', value: 'DID-based' }
	] satisfies ProfileKeyComponent[],
	useCases: [
		'Browser-based credential exchange',
		'Educational credential issuance and verification',
		'Skills-based hiring workflows',
		'Cross-institutional credential transfer'
	]
};

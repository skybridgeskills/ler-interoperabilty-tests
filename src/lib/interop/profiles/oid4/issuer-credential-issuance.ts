import { WorkflowChecklist } from '../../profile-schema.js';

/** Issuer × Credential Issuance × OID4. */
export const issuerCredentialIssuance = WorkflowChecklist({
	role: 'issuer',
	workflow: 'credential-issuance',
	profile: 'oid4',
	steps: [
		{
			title: 'Provide credential offer',
			summary:
				'Create an OID4VCI credential offer when the user has earned a badge. Expose it via QR code, deep link, or copy-paste, including the credential issuer metadata endpoint or pre-authorized code.',
			requirements: [
				{ level: 'MUST', text: 'Provide a credential issuer metadata endpoint.' },
				{
					level: 'MUST',
					text: 'Advertise OID4VCI issuer metadata whose `credential_configurations_supported` includes a `proof_types_supported` object containing `di_vp` (Data Integrity verifiable-presentation key proofs).'
				},
				{
					level: 'MUST',
					text: 'List `proof_signing_alg_values_supported` for the `di_vp` proof type covering the supported cryptosuites (see the data-integrity-cryptosuites additive profile).'
				},
				{
					level: 'MUST',
					text: 'NOT require a JWT-only key proof type: this profile requires `di_vp` key proofs of possession.'
				},
				{ level: 'MUST', text: 'Support the OID4VCI authorization code flow.' },
				{ level: 'MUST', text: 'Support the OID4VCI pre-authorized code flow.' },
				{ level: 'MUST', text: 'Encrypt web-service endpoints with at least TLS 1.2.' }
			]
		},
		{
			title: 'Handle authorization request',
			summary:
				'Receive the holder’s authorization request. Authenticate or validate the pre-authorized code, then issue an authorization code or access token.',
			requirements: [
				{
					level: 'MUST',
					text: 'Implement an OAuth 2.0-protected authorization endpoint.'
				},
				{ level: 'MUST', text: 'Support authorization-code flow.' },
				{ level: 'MUST', text: 'Support pre-authorized-code flow.' },
				{ level: 'MUST', text: 'Implement proper error handling and status codes.' }
			]
		},
		{
			title: 'Process credential request and deliver credential',
			summary:
				'Validate the access token, build the Open Badges 3.0 credential, sign it with a supported cryptosuite (see the data-integrity-cryptosuites additive), allocate a status-list index, and respond with a credential response.',
			requirements: [
				{
					level: 'MUST',
					text: 'Generate W3C Verifiable Credentials Data Model 2.0-compliant credentials.'
				},
				{
					level: 'MUST',
					text: 'Use the `OpenBadgeCredential` type and comply with the Open Badges 3.0 schema.'
				},
				{
					level: 'MUST',
					text: 'Use a Data Integrity Proof whose cryptosuite is declared by the data-integrity-cryptosuites additive profile, including proof creation date and verification-method reference.'
				},
				{
					level: 'MUST',
					text: 'Maintain a current Bitstring Status List signed with the issuer key and reference it from `credentialStatus`.'
				},
				{
					level: 'MUST',
					text: 'Use a did:web or did:key issuer identifier whose verification method matches the chosen cryptosuite (key-type per data-integrity-cryptosuites additive) and resolves correctly.'
				},
				{
					level: 'MUST',
					text: 'Require a `di_vp` key proof in the Credential Request `proofs` and validate its W3C VP Data Integrity proof: `proofPurpose` is `authentication`, `domain` equals the Credential Issuer Identifier, and `challenge` equals the issued `c_nonce`.'
				},
				{
					level: 'MUST',
					text: 'Verify the holder controls the key referenced by the `di_vp` proof’s `verificationMethod` before binding `credentialSubject.id`.'
				},
				{
					level: 'MUST',
					text: 'Implement an OAuth 2.0-protected credential endpoint with proper error handling.'
				},
				{ level: 'MUST', text: 'Encrypt web-service endpoints with at least TLS 1.2.' },
				{ level: 'SHOULD', text: 'Support credential expiration via `validUntil`.' }
			]
		}
	]
});

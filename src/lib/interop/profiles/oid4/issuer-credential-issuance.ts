import { WorkflowChecklist } from '../../profile-schema.js';

/**
 * Issuer × Credential Issuance × OID4.
 *
 * Requirement `id`s are namespaced `oid4.issuer.credential-issuance.*` and drive the test-wallet
 * issuer-flow check registry (`server/domain/wallet-runner/checks/oid4-issuer-flow.ts`). This
 * profile standardizes OID4VCI 1.0 issuance on the **pre-authorized-code** flow; the
 * authorization-code grant is intentionally not part of the profile. The `credential-endpoint`
 * clause notes that its error-handling half is not negatively probed on the happy path.
 */
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
				{
					id: 'oid4.issuer.credential-issuance.metadata-endpoint',
					level: 'MUST',
					text: 'Provide a credential issuer metadata endpoint.'
				},
				{
					id: 'oid4.issuer.credential-issuance.di-vp-proof-type',
					level: 'MUST',
					text: 'Advertise OID4VCI issuer metadata whose `credential_configurations_supported` includes a `proof_types_supported` object containing `di_vp` (Data Integrity verifiable-presentation key proofs).'
				},
				{
					id: 'oid4.issuer.credential-issuance.di-vp-signing-algs',
					level: 'MUST',
					text: 'List `proof_signing_alg_values_supported` for the `di_vp` proof type covering the supported cryptosuites (see the data-integrity-cryptosuites additive profile).'
				},
				{
					id: 'oid4.issuer.credential-issuance.not-jwt-only-proof',
					level: 'MUST',
					text: 'NOT require a JWT-only key proof type: this profile requires `di_vp` key proofs of possession.'
				},
				{
					id: 'oid4.issuer.credential-issuance.tls',
					level: 'MUST',
					text: 'Encrypt web-service endpoints with at least TLS 1.2.'
				}
			]
		},
		{
			title: 'Issue an access token',
			summary:
				'Accept the pre-authorized code at the token endpoint and issue an access token (and a `c_nonce`).',
			requirements: [
				{
					id: 'oid4.issuer.credential-issuance.pre-authorized-code-flow',
					level: 'MUST',
					text: 'Support the OID4VCI pre-authorized-code flow: accept the `pre-authorized_code` at the token endpoint and issue an access token.'
				}
			]
		},
		{
			title: 'Process credential request and deliver credential',
			summary:
				'Validate the access token, build the Open Badges 3.0 credential, sign it with a supported cryptosuite (see the data-integrity-cryptosuites additive), allocate a status-list index, and respond with a credential response.',
			requirements: [
				{
					id: 'oid4.issuer.credential-issuance.vcdm-2',
					level: 'MUST',
					text: 'Generate W3C Verifiable Credentials Data Model 2.0-compliant credentials.'
				},
				{
					id: 'oid4.issuer.credential-issuance.openbadge-3',
					level: 'MUST',
					text: 'Use the `OpenBadgeCredential` type and comply with the Open Badges 3.0 schema.'
				},
				{
					id: 'oid4.issuer.credential-issuance.di-proof',
					level: 'MUST',
					text: 'Use a Data Integrity Proof whose cryptosuite is declared by the data-integrity-cryptosuites additive profile, including proof creation date and verification-method reference.'
				},
				{
					id: 'oid4.issuer.credential-issuance.status-list',
					level: 'MUST',
					text: 'Maintain a current Bitstring Status List signed with the issuer key and reference it from `credentialStatus`.'
				},
				{
					id: 'oid4.issuer.credential-issuance.issuer-did',
					level: 'MUST',
					text: 'Use a did:web or did:key issuer identifier whose verification method matches the chosen cryptosuite (key-type per data-integrity-cryptosuites additive) and resolves correctly.'
				},
				{
					id: 'oid4.issuer.credential-issuance.di-vp-required',
					level: 'MUST',
					text: 'Require a `di_vp` key proof in the Credential Request `proofs` and validate its W3C VP Data Integrity proof: `proofPurpose` is `authentication`, `domain` equals the Credential Issuer Identifier, and `challenge` equals the issued `c_nonce`.'
				},
				{
					id: 'oid4.issuer.credential-issuance.binds-verified-holder',
					level: 'MUST',
					text: 'Verify the holder controls the key referenced by the `di_vp` proof’s `verificationMethod` before binding `credentialSubject.id`.'
				},
				{
					id: 'oid4.issuer.credential-issuance.credential-endpoint',
					level: 'MUST',
					text: 'Implement an OAuth 2.0-protected credential endpoint with proper error handling. The test wallet confirms the endpoint required a Bearer token and delivered a credential; the error-handling half is not negatively probed here.'
				},
				{
					id: 'oid4.issuer.credential-issuance.tls-credential',
					level: 'MUST',
					text: 'Encrypt web-service endpoints with at least TLS 1.2.'
				},
				{
					id: 'oid4.issuer.credential-issuance.valid-until',
					level: 'SHOULD',
					text: 'Support credential expiration via `validUntil`.'
				}
			]
		}
	]
});

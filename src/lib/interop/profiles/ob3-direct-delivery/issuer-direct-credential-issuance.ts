import { WorkflowChecklist } from '../../profile-schema.js';

/**
 * Issuer × Direct Credential Issuance × OB 3.0 Direct Delivery.
 *
 * Each requirement carries a stable `id` keyed off
 * `ob3-direct-delivery.<topic>.<assertion>`. The issuer-runner check
 * registry maps these ids to automated check functions.
 */
export const issuerDirectCredentialIssuance = WorkflowChecklist({
	role: 'issuer',
	workflow: 'direct-credential-issuance',
	profile: 'ob3-direct-delivery',
	steps: [
		{
			title: 'Authenticate user and authorize issuance',
			summary:
				'Authenticate the user via SSO/login on the issuer platform and verify their identity and earned achievements before issuing a credential.',
			requirements: [
				{
					id: 'ob3-direct-delivery.auth.secure-login',
					level: 'SHOULD',
					text: 'Implement secure user authentication (SSO/login).'
				},
				{
					id: 'ob3-direct-delivery.auth.verify-identity',
					level: 'SHOULD',
					text: 'Verify user identity before credential issuance.'
				}
			]
		},
		{
			title: 'Create and sign the credential',
			summary:
				'Build the Open Badges 3.0 credential with an email-based subject identifier, sign it with eddsa-rdfc-2022, and allocate a Bitstring Status List index.',
			requirements: [
				{
					id: 'ob3-direct-delivery.vc-data-model-v2-compliant',
					level: 'MUST',
					text: 'Generate W3C Verifiable Credentials Data Model 2.0-compliant credentials.'
				},
				{
					id: 'ob3-direct-delivery.openbadgecredential-type',
					level: 'MUST',
					text: 'Use the `OpenBadgeCredential` type and comply with the Open Badges 3.0 schema, including all mandatory fields.'
				},
				{
					id: 'ob3-direct-delivery.subject-id-is-email',
					level: 'MUST',
					text: 'Use email-based identifiers in `credentialSubject` (per Open Badges 3.0 spec).'
				},
				{
					id: 'ob3-direct-delivery.data-integrity-eddsa-rdfc-2022',
					level: 'MUST',
					text: 'Use a Data Integrity Proof with `eddsa-rdfc-2022`, including proof creation date and verification-method reference.'
				},
				{
					id: 'ob3-direct-delivery.bitstring-status-list-entry',
					level: 'MUST',
					text: 'Maintain a current Bitstring Status List signed with the issuer key and reference it from `credentialStatus`.'
				},
				{
					id: 'ob3-direct-delivery.issuer-did-method',
					level: 'MUST',
					text: 'Use a did:web or did:key issuer identifier with an Ed25519 verification method that resolves correctly.'
				},
				{
					id: 'ob3-direct-delivery.valid-until-optional',
					level: 'SHOULD',
					text: 'Support credential expiration via `validUntil`.'
				},
				{
					id: 'ob3-direct-delivery.status-list-revocation-updates',
					level: 'SHOULD',
					text: 'Update the status list when credentials are revoked.'
				}
			]
		},
		{
			title: 'Deliver the credential as a file or copy-paste text',
			summary:
				'Provide the signed credential as a downloadable JSON file and as copy-paste JSON text. Validate file format before delivery and ensure the recipient can save and re-share it.',
			requirements: [
				{
					id: 'ob3-direct-delivery.delivery.downloadable-file',
					level: 'MUST',
					text: 'Provide the credential as a downloadable JSON file.'
				},
				{
					id: 'ob3-direct-delivery.delivery.copy-paste-text',
					level: 'MUST',
					text: 'Provide the credential as copy-paste JSON text.'
				},
				{
					id: 'ob3-direct-delivery.delivery.recipient-can-share',
					level: 'MUST',
					text: 'Ensure the credential can be saved and shared by recipients.'
				},
				{
					id: 'ob3-direct-delivery.delivery.file-format-validation',
					level: 'MUST',
					text: 'Implement proper file format validation.'
				}
			]
		}
	]
});

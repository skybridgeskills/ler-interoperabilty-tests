import { WorkflowChecklist } from '../../profile-schema.js';

/** Issuer × Credential Issuance × VCALM-EdDSA. */
export const issuerCredentialIssuance = WorkflowChecklist({
	role: 'issuer',
	workflow: 'credential-issuance',
	profile: 'vcalm-eddsa',
	steps: [
		{
			title: 'Create exchange and expose interaction URL',
			summary:
				'Create a VCALM exchange when the user has earned a badge. Expose the interaction URL via QR code, deep link, or copy-paste so the holder wallet can fetch it.',
			requirements: [
				{
					level: 'MUST',
					text: 'Generate the interaction URL and expose it as a QR code (cross-device) and a copyable URL (same-device).'
				},
				{
					level: 'MUST',
					text: 'Implement the VCALM Exchanges exchange-participation endpoint.'
				},
				{ level: 'MUST', text: 'Encrypt web-service endpoints with at least TLS 1.2.' }
			]
		},
		{
			title: 'Respond to the interaction-URL fetch',
			summary:
				'Return the protocols list including the `vcapi` interaction URL so the holder can advance to the exchange.',
			requirements: [
				{
					level: 'MUST',
					text: 'Implement the VCALM Exchanges participation endpoint with ProblemDetails error handling.'
				},
				{
					level: 'MUST',
					text: 'Include `vcapi` in the Interaction Protocols response.'
				}
			]
		},
		{
			title: 'Handle the empty POST and request DIDAuthentication',
			summary:
				'When the holder POSTs `{}` to the exchange, respond with a `verifiablePresentationRequest` containing a `DIDAuthentication` query so the holder proves control of their DID.',
			requirements: [
				{
					level: 'MUST',
					text: 'Include a `DIDAuthentication` query (via `QueryByExample`) in the `verifiablePresentationRequest`.'
				},
				{ level: 'MUST', text: 'Express any errors as ProblemDetails objects.' }
			]
		},
		{
			title: 'Receive DIDAuthentication, create credential, and deliver it',
			summary:
				'Validate the DIDAuthentication presentation, build the Open Badges 3.0 credential addressed to the verified holder DID, sign it with eddsa-rdfc-2022, allocate a status list index, and return it inside a verifiablePresentation.',
			requirements: [
				{
					level: 'MUST',
					text: 'Generate W3C Verifiable Credentials Data Model 2.0-compliant credentials.'
				},
				{
					level: 'MUST',
					text: 'Use the `OpenBadgeCredential` type and comply with the Open Badges 3.0 schema, including all mandatory fields.'
				},
				{
					level: 'MUST',
					text: 'Use a Data Integrity Proof with `eddsa-rdfc-2022`, including proof creation date and verification-method reference.'
				},
				{
					level: 'MUST',
					text: 'Maintain a current Bitstring Status List signed with the issuer key and reference it via BitStringStatusList in `credentialStatus`.'
				},
				{
					level: 'MUST',
					text: 'Use a did:web or did:key issuer identifier with an Ed25519 verification method that resolves correctly.'
				},
				{ level: 'SHOULD', text: 'Support credential expiration via `validUntil`.' }
			]
		}
	]
});

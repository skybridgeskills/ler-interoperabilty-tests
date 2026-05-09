import { WorkflowChecklist } from '../../profile-schema.js';

/** Wallet (holder) × Credential Acceptance × OID4-ECDSA. */
export const walletCredentialAcceptance = WorkflowChecklist({
	role: 'wallet',
	workflow: 'credential-acceptance',
	profile: 'oid4-ecdsa',
	steps: [
		{
			title: 'Process the credential offer',
			summary:
				'Open the OID4VCI credential offer (QR / deep link / copy-paste), discover the credential issuer metadata endpoint, and fetch its configuration.',
			requirements: [
				{ level: 'MUST', text: 'Implement the OID4VCI v1.0 specification.' },
				{ level: 'MUST', text: 'Handle credential issuer metadata discovery.' },
				{ level: 'MUST', text: 'Require secure transport (TLS) for OID4VCI endpoints.' }
			]
		},
		{
			title: 'Complete authorization and token exchange',
			summary:
				'Run the OAuth 2.0 authorization-code flow (or pre-authorized-code flow) to obtain an access token. Ask the user for consent.',
			requirements: [
				{ level: 'MUST', text: 'Implement OAuth 2.0 client functionality.' },
				{ level: 'MUST', text: 'Support authorization-code flow.' },
				{ level: 'MUST', text: 'Support pre-authorized-code flow.' },
				{ level: 'MUST', text: 'Implement explicit user-consent mechanisms.' }
			]
		},
		{
			title: 'Request and receive the credential',
			summary:
				'Call the issuer’s OAuth 2.0-protected credential endpoint with the access token. Verify the ecdsa-rdfc-2019 signature, resolve the issuer DID, validate dates, and check the Bitstring Status List.',
			requirements: [
				{ level: 'MUST', text: 'Process credential responses.' },
				{
					level: 'MUST',
					text: 'Verify ecdsa-rdfc-2019 signatures on credentials received from issuers.'
				},
				{
					level: 'MUST',
					text: 'Resolve issuer DIDs (did:web / did:key) to DID documents with a P-256 verification method.'
				},
				{
					level: 'MUST',
					text: 'Validate proof creation dates and credential expiration dates.'
				},
				{ level: 'MUST', text: 'Implement Bitstring Status List checking.' },
				{ level: 'MUST', text: 'Validate status-list signature and freshness.' },
				{
					level: 'SHOULD',
					text: 'Handle status-service unavailability and other errors gracefully.'
				},
				{ level: 'SHOULD', text: 'Cache status information appropriately.' }
			]
		},
		{
			title: 'Accept and store the credential',
			summary:
				'Prompt the user to accept, store the credential preserving its proof, and ensure it can be exported and presented later.',
			requirements: [
				{ level: 'MUST', text: 'Support credential export in standard formats.' },
				{
					level: 'MUST',
					text: 'Preserve original credential proofs and signatures for later presentation.'
				},
				{
					level: 'MUST',
					text: 'Support did:web or did:key DID methods for credential subject identity.'
				},
				{
					level: 'MUST',
					text: 'Generate and manage P-256 key pairs for credential subjects with resolvable did:key or did:web documents.'
				},
				{ level: 'MUST', text: 'Store credentials for later presentation.' },
				{
					level: 'SHOULD',
					text: 'Store credentials securely and allow user management of stored data.'
				}
			]
		}
	]
});

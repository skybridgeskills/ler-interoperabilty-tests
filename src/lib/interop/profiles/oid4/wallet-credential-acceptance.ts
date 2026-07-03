import { WorkflowChecklist } from '../../profile-schema.js';

/** Wallet (holder) × Credential Acceptance × OID4. */
export const walletCredentialAcceptance = WorkflowChecklist({
	role: 'wallet',
	workflow: 'credential-acceptance',
	profile: 'oid4',
	steps: [
		{
			title: 'Process the credential offer',
			summary:
				'Open the OID4VCI credential offer (QR / deep link / copy-paste), discover the credential issuer metadata endpoint, and fetch its configuration.',
			requirements: [
				{
					level: 'MUST',
					text: 'Discover the credential issuer metadata from the offer’s Credential Issuer Identifier (the OID4VCI `/.well-known/openid-credential-issuer` endpoint).'
				},
				{ level: 'MUST', text: 'Require secure transport (TLS) for OID4VCI endpoints.' }
			]
		},
		{
			title: 'Redeem the pre-authorized code for an access token',
			summary:
				'Redeem the pre-authorized code at the issuer’s token endpoint for an access token and a `c_nonce`, prompting the user for consent.',
			requirements: [
				{
					level: 'MUST',
					text: 'Support the OID4VCI pre-authorized-code flow: redeem the `pre-authorized_code` at the token endpoint for an access token.'
				},
				{ level: 'MUST', text: 'Implement explicit user-consent mechanisms.' }
			]
		},
		{
			title: 'Request and receive the credential',
			summary:
				'Call the issuer’s OAuth 2.0-protected credential endpoint with the access token. Verify the credential signature in any cryptosuite declared by the data-integrity-cryptosuites additive profile, resolve the issuer DID, validate dates, and check the Bitstring Status List.',
			requirements: [
				{
					level: 'MUST',
					text: 'Present a `di_vp` key proof in the Credential Request: a W3C Verifiable Presentation secured with a Data Integrity proof (`proofPurpose` `authentication`, `domain` set to the Credential Issuer Identifier, `challenge` set to the issuer `c_nonce`), signed with a cryptosuite listed in the issuer’s `proof_signing_alg_values_supported`.'
				},
				{
					level: 'MUST',
					text: 'NOT rely on a JWT-only key proof: the OID4 base requires a `di_vp` key proof of possession.'
				},
				{ level: 'MUST', text: 'Process credential responses.' },
				{
					level: 'MUST',
					text: 'Verify credential signatures using every cryptosuite declared by the data-integrity-cryptosuites additive profile.'
				},
				{
					level: 'MUST',
					text: 'Resolve issuer DIDs (did:web / did:key) to a DID document with a verification method matching the credential proof’s cryptosuite (see data-integrity-cryptosuites additive).'
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
					text: 'Generate and manage credential-subject key pairs matching the chosen cryptosuite (see data-integrity-cryptosuites additive) with resolvable did:key or did:web documents.'
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

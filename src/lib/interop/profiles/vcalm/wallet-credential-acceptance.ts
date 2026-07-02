import { WorkflowChecklist } from '../../profile-schema.js';

/** Wallet (holder) × Credential Acceptance × VCALM. */
export const walletCredentialAcceptance = WorkflowChecklist({
	role: 'wallet',
	workflow: 'credential-acceptance',
	profile: 'vcalm',
	steps: [
		{
			title: 'Access the interaction URL',
			summary:
				'Open the issuer-supplied interaction URL via QR scan, deep link, or copy-paste, and fetch it from inside the wallet.',
			requirements: [
				{
					level: 'MUST',
					text: 'Implement VCALM Exchanges interaction URLs and process `vcapi` protocol URLs.'
				},
				{
					level: 'MUST',
					text: 'Require secure transport (TLS) for VCALM exchange endpoints and interaction URLs.'
				}
			]
		},
		{
			title: 'Discover the protocol and request the exchange',
			summary:
				'Read the protocols list, then POST `{}` to the `vcapi` interaction URL to start the exchange.',
			requirements: [
				{
					level: 'MUST',
					text: 'Initiate a VCALM exchange at the participation endpoint with an empty request body.'
				}
			]
		},
		{
			title: 'Respond to the DIDAuthentication request',
			summary:
				'Receive the `verifiablePresentationRequest`, ask the user for consent, and post a verifiablePresentation that proves control of the holder’s DID using a cryptosuite from the data-integrity-cryptosuites additive profile.',
			requirements: [
				{
					level: 'MUST',
					text: 'Handle `DIDAuthentication` queries by responding with signed VPs using VCDM 2.0.'
				},
				{ level: 'MUST', text: 'Implement explicit user-consent mechanisms.' },
				{
					level: 'MUST',
					text: 'Create verifiable presentations signed with a cryptosuite declared by the data-integrity-cryptosuites additive profile.'
				},
				{
					level: 'MUST',
					text: 'Secure the DIDAuthentication verifiablePresentation with a Data Integrity proof whose `proofPurpose` is `authentication` and whose `challenge` is the value from the `verifiablePresentationRequest`.'
				},
				{
					level: 'MUST',
					text: 'Prove control of the credential-subject DID’s verification-method key referenced by the VP proof.'
				},
				{
					level: 'MUST',
					text: 'Generate and manage credential-subject key pairs matching the chosen cryptosuite (see data-integrity-cryptosuites additive) with resolvable did:key or did:web documents.'
				}
			]
		},
		{
			title: 'Receive and verify the credential',
			summary:
				'Parse the issuer’s verifiablePresentation, verify the credential signature in any cryptosuite declared by the data-integrity-cryptosuites additive profile, resolve the issuer DID, validate dates, and check the Bitstring Status List.',
			requirements: [
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
				'Prompt the user to accept, store the credential preserving its original proof, and ensure it can be exported and presented later.',
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
				{ level: 'MUST', text: 'Store credentials for later presentation.' },
				{
					level: 'SHOULD',
					text: 'Store credentials securely and allow user management of stored data.'
				}
			]
		}
	]
});

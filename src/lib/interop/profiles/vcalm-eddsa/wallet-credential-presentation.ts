import { WorkflowChecklist } from '../../profile-schema.js';

/** Wallet (holder) × Credential Presentation × VCALM-EdDSA. */
export const walletCredentialPresentation = WorkflowChecklist({
	role: 'wallet',
	workflow: 'credential-presentation',
	profile: 'vcalm-eddsa',
	steps: [
		{
			title: 'Access the interaction URL',
			summary:
				'Open the verifier’s interaction URL via QR scan, deep link, or copy-paste, and fetch it from inside the wallet.',
			requirements: [
				{
					level: 'MUST',
					text: 'Implement VCALM Exchanges interaction URLs and process `vcapi` protocol URLs.'
				},
				{ level: 'MUST', text: 'Require secure transport (TLS) for VCALM endpoints.' }
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
			title: 'Process the presentation request and create the presentation',
			summary:
				'Parse the verifier’s `verifiablePresentationRequest`, identify matching stored credentials, ask the user for consent, and build a verifiablePresentation containing the selected credentials, the DIDAuthentication proof, and a presentation proof bound to the verifier’s challenge.',
			requirements: [
				{ level: 'MUST', text: 'Process credential requests from verifiers.' },
				{ level: 'MUST', text: 'Provide a credential presentation interface.' },
				{
					level: 'MUST',
					text: 'Handle `DIDAuthentication` queries by responding with signed VPs using VCDM 2.0.'
				},
				{ level: 'MUST', text: 'Implement explicit user-consent mechanisms.' },
				{
					level: 'MUST',
					text: 'Create verifiable presentations with EdDSA signatures.'
				},
				{
					level: 'MUST',
					text: 'Generate and manage Ed25519 key pairs for credential subjects with resolvable did:key or did:web documents.'
				}
			]
		},
		{
			title: 'Complete presentation delivery',
			summary:
				'Confirm the verifiablePresentation has been delivered. The verifier handles the verification step.',
			requirements: [
				{
					level: 'MUST',
					text: 'Preserve original credential proofs and signatures when including credentials in presentations.'
				}
			]
		}
	]
});

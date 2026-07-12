import { WorkflowChecklist } from '../../profile-schema.js';

/** Wallet (holder) × Credential Presentation × VCALM. */
export const walletCredentialPresentation = WorkflowChecklist({
	role: 'wallet',
	workflow: 'credential-presentation',
	profile: 'vcalm',
	steps: [
		{
			title: 'Access the interaction URL',
			summary:
				'Open the verifier’s interaction URL via QR scan, deep link, or copy-paste, and fetch it from inside the wallet.',
			requirements: [
				{
					id: 'vcalm.wallet.credential-presentation.interaction-url-support',
					level: 'MUST',
					text: 'Implement VCALM Exchanges interaction URLs and process `vcapi` protocol URLs.'
				},
				{
					id: 'vcalm.wallet.credential-presentation.tls',
					level: 'MUST',
					text: 'Require secure transport (TLS) for VCALM endpoints.'
				}
			]
		},
		{
			title: 'Discover the protocol and request the exchange',
			summary:
				'Read the protocols list, then POST `{}` to the `vcapi` interaction URL to start the exchange.',
			requirements: [
				{
					id: 'vcalm.wallet.credential-presentation.initiate-exchange',
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
				{
					id: 'vcalm.wallet.credential-presentation.process-request',
					level: 'MUST',
					text: 'Process credential requests from verifiers.'
				},
				{
					id: 'vcalm.wallet.credential-presentation.presentation-interface',
					level: 'MUST',
					text: 'Provide a credential presentation interface.'
				},
				{
					id: 'vcalm.wallet.credential-presentation.proof-binding',
					level: 'MUST',
					text: 'Handle `DIDAuthentication` queries by responding with signed VPs using VCDM 2.0, binding the presentation proof to the verifier’s `challenge`.'
				},
				{
					id: 'vcalm.wallet.credential-presentation.user-consent',
					level: 'MUST',
					text: 'Implement explicit user-consent mechanisms.'
				},
				{
					id: 'vcalm.wallet.credential-presentation.sign-vp',
					level: 'MUST',
					text: 'Create verifiable presentations signed with a cryptosuite declared by the data-integrity-cryptosuites additive profile.'
				},
				{
					id: 'vcalm.wallet.credential-presentation.manage-keys',
					level: 'MUST',
					text: 'Generate and manage credential-subject key pairs matching the chosen cryptosuite (see data-integrity-cryptosuites additive) with resolvable did:key or did:web documents.'
				}
			]
		},
		{
			title: 'Complete presentation delivery',
			summary:
				'Confirm the verifiablePresentation has been delivered. The verifier handles the verification step.',
			requirements: [
				{
					id: 'vcalm.wallet.credential-presentation.preserve-proofs',
					level: 'MUST',
					text: 'Preserve original credential proofs and signatures when including credentials in presentations.'
				}
			]
		}
	]
});

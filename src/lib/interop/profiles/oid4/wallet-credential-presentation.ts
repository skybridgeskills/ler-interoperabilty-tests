import { WorkflowChecklist } from '../../profile-schema.js';

/** Wallet (holder) × Credential Presentation × OID4. */
export const walletCredentialPresentation = WorkflowChecklist({
	role: 'wallet',
	workflow: 'credential-presentation',
	profile: 'oid4',
	steps: [
		{
			title: 'Process the presentation request',
			summary:
				'Receive the verifier’s OID4VP Authorization Request and identify which stored credentials match its query.',
			requirements: [
				{
					level: 'MUST',
					text: 'Receive and parse the verifier’s OID4VP Authorization Request (its `presentation_definition` / DCQL query) and identify matching stored credentials.'
				},
				{ level: 'MUST', text: 'Require secure transport (TLS) for OID4VP endpoints.' }
			]
		},
		{
			title: 'Select credentials and obtain user consent',
			summary:
				'Let the user select which stored credentials to share and obtain explicit consent before building the presentation.',
			requirements: [
				{ level: 'MUST', text: 'Implement explicit user-consent mechanisms.' },
				{ level: 'MUST', text: 'Provide a credential presentation interface.' }
			]
		},
		{
			title: 'Create and send the presentation response',
			summary:
				'Build a `di_vp` verifiablePresentation of the selected credentials, sign it with a cryptosuite declared by the data-integrity-cryptosuites additive profile, and return it to the verifier as the `vp_token` (e.g. via `direct_post`).',
			requirements: [
				{
					level: 'MUST',
					text: 'Build the verifiablePresentation as a Data Integrity presentation (`di_vp` / `ldp_vp`), not a JWT VP.'
				},
				{
					level: 'MUST',
					text: 'Create verifiable presentations signed with a cryptosuite declared by the data-integrity-cryptosuites additive profile.'
				},
				{
					level: 'MUST',
					text: 'Generate and manage credential-subject key pairs matching the chosen cryptosuite (see data-integrity-cryptosuites additive) with resolvable did:key or did:web documents.'
				},
				{
					level: 'MUST',
					text: 'Preserve original credential proofs and signatures when including credentials in presentations.'
				}
			]
		},
		{
			title: 'Complete presentation delivery',
			summary:
				'Return the `vp_token` to the verifier’s response endpoint and confirm delivery. The verifier performs verification.',
			requirements: [
				{
					level: 'MUST',
					text: 'Deliver the `vp_token` to the verifier’s response endpoint (e.g. `direct_post`) and handle the delivery response.'
				}
			]
		}
	]
});

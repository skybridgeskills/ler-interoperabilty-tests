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
				'Open the verifier’s OID4VP presentation request (QR / deep link / copy-paste) and identify which stored credentials match.',
			requirements: [
				{ level: 'MUST', text: 'Implement the OID4VP v1.0 specification.' },
				{ level: 'MUST', text: 'Handle presentation requests from verifiers.' },
				{ level: 'MUST', text: 'Require secure transport (TLS) for OID4VP endpoints.' }
			]
		},
		{
			title: 'Complete authorization',
			summary:
				'Run the OAuth 2.0 authorization flow and obtain an access token after the user selects which credentials to share.',
			requirements: [
				{ level: 'MUST', text: 'Implement OAuth 2.0 client functionality.' },
				{ level: 'MUST', text: 'Support authorization-code flow.' },
				{ level: 'MUST', text: 'Implement explicit user-consent mechanisms.' },
				{ level: 'MUST', text: 'Provide a credential presentation interface.' }
			]
		},
		{
			title: 'Create and send the presentation response',
			summary:
				'Build a verifiablePresentation containing the selected credentials, sign it with a cryptosuite declared by the data-integrity-cryptosuites additive profile, and POST it to the verifier’s OAuth 2.0-protected endpoint with the access token.',
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
				'Confirm the presentation response was delivered. The verifier handles the verification step.',
			requirements: [
				{
					level: 'MUST',
					text: 'Preserve original credential proofs and signatures when including credentials in presentations.'
				}
			]
		}
	]
});

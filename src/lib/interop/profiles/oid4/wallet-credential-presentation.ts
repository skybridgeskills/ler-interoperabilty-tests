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
				'Receive the verifier’s OID4VP 1.0 Authorization Request and identify which stored credentials match its `dcql_query`.',
			requirements: [
				{
					id: 'oid4.wallet.credential-presentation.accept-unsigned-request',
					level: 'MUST',
					text: 'MUST accept an unsigned OID4VP 1.0 authorization request using the `redirect_uri` client_id scheme (`client_id` = `redirect_uri:<response_uri>`), without requiring a signed request object.'
				},
				{
					id: 'oid4.wallet.credential-presentation.parse-request',
					level: 'MUST',
					text: 'Receive and parse the verifier’s OID4VP 1.0 Authorization Request and its `dcql_query`, and identify matching stored credentials.'
				},
				{
					id: 'oid4.wallet.credential-presentation.tls',
					level: 'MUST',
					text: 'Require secure transport (TLS) for OID4VP endpoints.'
				}
			]
		},
		{
			title: 'Select credentials and obtain user consent',
			summary:
				'Let the user select which stored credentials to share and obtain explicit consent before building the presentation.',
			requirements: [
				{
					id: 'oid4.wallet.credential-presentation.user-consent',
					level: 'MUST',
					text: 'Implement explicit user-consent mechanisms.'
				},
				{
					id: 'oid4.wallet.credential-presentation.presentation-interface',
					level: 'MUST',
					text: 'Provide a credential presentation interface.'
				}
			]
		},
		{
			title: 'Create and send the presentation response',
			summary:
				'Build an `ldp_vp` verifiablePresentation of the selected credentials, sign it with a cryptosuite declared by the data-integrity-cryptosuites additive profile, bind its proof to the request, and return the `vp_token` as a DCQL response object keyed by the credential-query `id` (no `presentation_submission`) via `direct_post`.',
			requirements: [
				{
					id: 'oid4.wallet.credential-presentation.di-vp-not-jwt',
					level: 'MUST',
					text: 'Build the verifiablePresentation as a Data Integrity presentation (`ldp_vp`), not a JWT VP.'
				},
				{
					id: 'oid4.wallet.credential-presentation.proof-binding',
					level: 'MUST',
					text: 'MUST bind the presentation proof to the request: set the VP proof `challenge` to the request `nonce`, and the proof `domain` (audience) to the request `client_id` (`redirect_uri:<response_uri>`).'
				},
				{
					id: 'oid4.wallet.credential-presentation.vp-signature-valid',
					level: 'MUST',
					text: 'Produce a `vp_token` whose VP proof cryptographically verifies against the credential-subject key.'
				},
				{
					id: 'oid4.wallet.credential-presentation.sign-vp',
					level: 'MUST',
					text: 'Create verifiable presentations signed with a cryptosuite declared by the data-integrity-cryptosuites additive profile.'
				},
				{
					id: 'oid4.wallet.credential-presentation.manage-keys',
					level: 'MUST',
					text: 'Generate and manage credential-subject key pairs matching the chosen cryptosuite (see data-integrity-cryptosuites additive) with resolvable did:key or did:web documents.'
				},
				{
					id: 'oid4.wallet.credential-presentation.preserve-proofs',
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
					id: 'oid4.wallet.credential-presentation.vp-delivered',
					level: 'MUST',
					text: 'Deliver the `vp_token` — a DCQL response object keyed by the credential-query `id`, with no `presentation_submission` — to the verifier’s response endpoint via `direct_post`, and handle the delivery response.'
				}
			]
		}
	]
});

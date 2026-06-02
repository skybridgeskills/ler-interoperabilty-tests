import { WorkflowChecklist } from '../../profile-schema.js';

/** Verifier × Credential Request and Verification × VCALM. */
export const verifierCredentialRequestAndVerification = WorkflowChecklist({
	role: 'verifier',
	workflow: 'credential-request-and-verification',
	profile: 'vcalm',
	steps: [
		{
			title: 'Create exchange and expose interaction URL',
			summary:
				'Create a VCALM exchange and a `verifiablePresentationRequest` using `QueryByExample` for `OpenBadgeCredential`, with a fresh challenge. Expose the interaction URL via QR / deep link / copy-paste.',
			requirements: [
				{
					level: 'MUST',
					text: 'Implement the VCALM Exchanges exchange-participation endpoint.'
				},
				{
					level: 'MUST',
					text: 'Generate a `verifiablePresentationRequest` with `QueryByExample` and a challenge value.'
				},
				{ level: 'MUST', text: 'Encrypt web-service endpoints with at least TLS 1.2.' }
			]
		},
		{
			title: 'Respond to the interaction-URL fetch',
			summary:
				'Return the protocols list including `vcapi` so the holder wallet can advance to the exchange.',
			requirements: [
				{
					level: 'MUST',
					text: 'Support an Interaction Protocols response that includes `vcapi`.'
				},
				{
					level: 'MUST',
					text: 'Report exchange errors using ProblemDetails objects.'
				}
			]
		},
		{
			title: 'Handle the empty POST and respond with a presentation request',
			summary:
				'On the holder’s POST `{}`, respond with the `verifiablePresentationRequest` containing both the credential request query and a `DIDAuthentication` query.',
			requirements: [
				{
					level: 'MUST',
					text: 'Include a `DIDAuthentication` query (via `QueryByExample`) in the request.'
				},
				{ level: 'MUST', text: 'Express any errors as ProblemDetails objects.' }
			]
		},
		{
			title: 'Receive presentation and verify credentials',
			summary:
				'Validate the verifiablePresentation structure, the holder DIDAuthentication proof, then verify each credential’s signature (in any cryptosuite declared by the data-integrity-cryptosuites additive profile), schema, status, and issuer trust.',
			requirements: [
				{
					level: 'MUST',
					text: 'Verify the verifiablePresentation against VCDM 2.0.'
				},
				{
					level: 'MUST',
					text: 'Resolve holder DIDs (did:key / did:web) and verify the presentation proof signature, creation date, challenge, and `expires` using any cryptosuite declared by the data-integrity-cryptosuites additive profile.'
				},
				{
					level: 'MUST',
					text: 'Validate VCDM 2.0 + Open Badges 3.0 schema, required fields, and credential expiration on each extracted credential.'
				},
				{
					level: 'MUST',
					text: 'Verify credential proofs using every cryptosuite declared by the data-integrity-cryptosuites additive profile.'
				},
				{
					level: 'MUST',
					text: 'Implement Bitstring Status List verification, including status-list signature and freshness, and handle status-service unavailability.'
				},
				{
					level: 'MUST',
					text: 'Integrate with trust registries to query issuer authorization and revocation.'
				},
				{ level: 'MUST', text: 'Encrypt web-service endpoints with at least TLS 1.2.' },
				{ level: 'SHOULD', text: 'Cache status information appropriately.' }
			]
		}
	]
});

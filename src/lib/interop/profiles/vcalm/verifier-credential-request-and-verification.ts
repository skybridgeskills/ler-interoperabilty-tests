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
					id: 'vcalm.verifier-exchange-endpoint',
					level: 'MUST',
					text: 'Implement the VCALM Exchanges exchange-participation endpoint.'
				},
				{
					id: 'vcalm.verifier-vpr-query',
					level: 'MUST',
					text: 'Generate a `verifiablePresentationRequest` with `QueryByExample` and a challenge value.'
				},
				{
					id: 'vcalm.verifier-request-tls',
					level: 'MUST',
					text: 'Encrypt web-service endpoints with at least TLS 1.2.'
				}
			]
		},
		{
			title: 'Respond to the interaction-URL fetch',
			summary:
				'Return the protocols list including `vcapi` so the holder wallet can advance to the exchange.',
			requirements: [
				{
					id: 'vcalm.verifier-interaction-endpoint',
					level: 'MUST',
					text: 'Support an Interaction Protocols response that includes `vcapi`.'
				},
				{
					id: 'vcalm.verifier-interaction-problemdetails',
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
					id: 'vcalm.verifier-vpr-didauth',
					level: 'MUST',
					text: 'Include a `DIDAuthentication` query in the request’s `query` array, alongside the `QueryByExample` credential query.'
				},
				{
					id: 'vcalm.verifier-vpr-problemdetails',
					level: 'MUST',
					text: 'Express any errors as ProblemDetails objects.'
				}
			]
		},
		{
			title: 'Receive presentation and verify credentials',
			summary:
				'Validate the verifiablePresentation structure, the holder DIDAuthentication proof, then verify each credential’s signature (in any cryptosuite declared by the data-integrity-cryptosuites additive profile), schema, status, and issuer trust.',
			requirements: [
				{
					id: 'vcalm.verifier-vp-vcdm',
					level: 'MUST',
					text: 'Verify the verifiablePresentation against VCDM 2.0.'
				},
				{
					id: 'vcalm.verifier-vp-proof',
					level: 'MUST',
					text: 'Resolve holder DIDs (did:key / did:web) and verify the presentation proof signature, creation date, challenge, and `expires` using any cryptosuite declared by the data-integrity-cryptosuites additive profile.'
				},
				{
					id: 'vcalm.verifier-credential-schema',
					level: 'MUST',
					text: 'Validate VCDM 2.0 + Open Badges 3.0 schema, required fields, and credential expiration on each extracted credential.'
				},
				{
					id: 'vcalm.verifier-credential-proof',
					level: 'MUST',
					text: 'Verify credential proofs using every cryptosuite declared by the data-integrity-cryptosuites additive profile.'
				},
				{
					id: 'vcalm.verifier-status-list',
					level: 'MUST',
					text: 'Implement Bitstring Status List verification, including status-list signature and freshness, and handle status-service unavailability.'
				},
				{
					id: 'vcalm.verifier-trust-registry',
					level: 'MUST',
					text: 'Integrate with trust registries to query issuer authorization and revocation.'
				},
				{
					id: 'vcalm.verifier-response-tls',
					level: 'MUST',
					text: 'Encrypt web-service endpoints with at least TLS 1.2.'
				},
				{
					id: 'vcalm.verifier-cache-status',
					level: 'SHOULD',
					text: 'Cache status information appropriately.'
				}
			]
		},
		{
			title: 'Demonstrate verification outcomes',
			summary:
				'Run the verification check: the suite’s test wallet presents your verifier a valid credential and several defective ones. Report what your verifier decided for each.',
			requirements: [
				{
					id: 'vcalm.verifier-accepts-valid-credential',
					level: 'MUST',
					text: 'Accept a valid credential.'
				},
				{
					id: 'vcalm.verifier-rejects-broken-signature',
					level: 'MUST',
					text: 'Reject a credential whose signature does not verify.'
				},
				{
					id: 'vcalm.verifier-rejects-schema-problem',
					level: 'MUST',
					text: 'Reject a credential that fails schema validation.'
				},
				{
					id: 'vcalm.verifier-rejects-expired',
					level: 'MUST',
					text: 'Reject an expired credential.'
				},
				{
					id: 'vcalm.verifier-rejects-revoked',
					level: 'MUST',
					text: 'Reject a revoked credential.'
				}
			]
		}
	]
});

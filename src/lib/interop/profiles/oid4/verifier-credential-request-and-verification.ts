import { WorkflowChecklist } from '../../profile-schema.js';

/** Verifier × Credential Request and Verification × OID4. */
export const verifierCredentialRequestAndVerification = WorkflowChecklist({
	role: 'verifier',
	workflow: 'credential-request-and-verification',
	profile: 'oid4',
	steps: [
		{
			title: 'Create presentation request',
			summary:
				'Build an OID4VP presentation request asking for credentials of type `OpenBadgeCredential`, with proper scopes. Expose it via QR code, deep link, or copy-paste.',
			requirements: [
				{
					id: 'oid4.verifier-request-matchable',
					level: 'MUST',
					text: 'Build an OID4VP Authorization Request with a `presentation_definition` / DCQL query for `OpenBadgeCredential` credentials.'
				},
				{
					id: 'oid4.verifier-request-di-vp-format',
					level: 'MUST',
					text: 'Request a Data Integrity verifiable presentation (`di_vp` / `ldp_vp`) format in the OID4VP presentation request, not a JWT VP.'
				},
				{
					id: 'oid4.verifier-request-endpoint',
					level: 'MUST',
					text: 'Provide a presentation request endpoint.'
				},
				{
					id: 'oid4.verifier-request-tls',
					level: 'MUST',
					text: 'Encrypt web-service endpoints with at least TLS 1.2.'
				}
			]
		},
		{
			title: 'Receive and verify the presentation',
			summary:
				'Receive the wallet’s `vp_token` at the response endpoint, then validate the presentation and, for each credential, verify the signature (in any cryptosuite declared by the data-integrity-cryptosuites additive profile), schema, expiration, and status.',
			requirements: [
				{
					id: 'oid4.verifier-response-endpoint',
					level: 'MUST',
					text: 'Provide a response endpoint (e.g. `direct_post`) that receives the presentation `vp_token`.'
				},
				{ level: 'MUST', text: 'Validate presentation structure and format.' },
				{ level: 'MUST', text: 'Extract credentials from presentations.' },
				{
					level: 'MUST',
					text: 'Validate VCDM 2.0 + Open Badges 3.0 schema, required fields, and credential expiration on each credential.'
				},
				{
					level: 'MUST',
					text: 'Verify credential proofs using every cryptosuite declared by the data-integrity-cryptosuites additive profile.'
				},
				{ level: 'MUST', text: 'Resolve issuer DIDs to obtain verification keys.' },
				{ level: 'MUST', text: 'Validate proof creation dates and expiration.' },
				{ level: 'MUST', text: 'Handle signature verification failures gracefully.' },
				{ level: 'MUST', text: 'Implement Bitstring Status List verification.' },
				{ level: 'MUST', text: 'Validate status-list signature and freshness.' },
				{
					id: 'oid4.verifier-response-tls',
					level: 'MUST',
					text: 'Encrypt web-service endpoints with at least TLS 1.2.'
				},
				{ level: 'SHOULD', text: 'Handle status-service unavailability.' },
				{ level: 'SHOULD', text: 'Cache status information appropriately.' },
				{
					level: 'SHOULD',
					text: 'Integrate with trust registries to query issuer authorization and revocation.'
				},
				{
					level: 'SHOULD',
					text: 'Implement protection against replay attacks, credential forgery, and status-list manipulation.'
				},
				{ level: 'SHOULD', text: 'Implement proper error logging and reporting.' },
				{ level: 'SHOULD', text: 'Maintain current trust registry data.' }
			]
		},
		{
			title: 'Demonstrate verification outcomes',
			summary:
				'Run the verification check: the suite’s test wallet presents your verifier a valid credential and several defective ones. Report what your verifier decided for each.',
			requirements: [
				{
					id: 'oid4.verifier-accepts-valid-credential',
					level: 'MUST',
					text: 'Accept a valid credential.'
				},
				{
					id: 'oid4.verifier-rejects-broken-signature',
					level: 'MUST',
					text: 'Reject a credential whose signature does not verify.'
				},
				{
					id: 'oid4.verifier-rejects-schema-problem',
					level: 'MUST',
					text: 'Reject a credential that fails schema validation.'
				},
				{
					id: 'oid4.verifier-rejects-expired',
					level: 'MUST',
					text: 'Reject an expired credential.'
				},
				{
					id: 'oid4.verifier-rejects-revoked',
					level: 'MUST',
					text: 'Reject a revoked credential.'
				}
			]
		}
	]
});

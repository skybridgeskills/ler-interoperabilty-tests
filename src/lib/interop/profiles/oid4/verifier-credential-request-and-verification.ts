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
				{ level: 'MUST', text: 'Implement the OID4VP v1.0 specification.' },
				{
					level: 'MUST',
					text: 'Generate presentation requests with proper scopes asking for specific credential types.'
				},
				{
					level: 'MUST',
					text: 'Request a Data Integrity verifiable presentation (`di_vp` / `ldp_vp`) format in the OID4VP presentation request, not a JWT VP.'
				},
				{ level: 'MUST', text: 'Provide a presentation request endpoint.' },
				{ level: 'MUST', text: 'Encrypt web-service endpoints with at least TLS 1.2.' }
			]
		},
		{
			title: 'Handle authorization request',
			summary:
				'Receive the holder wallet’s authorization request, authenticate, and issue an authorization code.',
			requirements: [
				{
					level: 'MUST',
					text: 'Implement an OAuth 2.0-protected authorization endpoint.'
				},
				{ level: 'MUST', text: 'Support authorization-code flow.' },
				{ level: 'MUST', text: 'Implement proper error handling and status codes.' }
			]
		},
		{
			title: 'Receive presentation response and verify credentials',
			summary:
				'Validate the access token and the verifiablePresentation, resolve the holder DID, then for each credential verify the signature (in any cryptosuite declared by the data-integrity-cryptosuites additive profile), schema, status, and issuer trust.',
			requirements: [
				{ level: 'MUST', text: 'Handle presentation responses from wallets.' },
				{ level: 'MUST', text: 'Validate presentation structure and format.' },
				{ level: 'MUST', text: 'Extract credentials from presentations.' },
				{
					level: 'MUST',
					text: 'Validate VCDM 2.0 + Open Badges 3.0 schema, required fields, and credential expiration on each credential.'
				},
				{ level: 'MUST', text: 'Implement comprehensive validation error handling.' },
				{
					level: 'MUST',
					text: 'Verify credential proofs using every cryptosuite declared by the data-integrity-cryptosuites additive profile.'
				},
				{ level: 'MUST', text: 'Resolve issuer DIDs to obtain verification keys.' },
				{ level: 'MUST', text: 'Validate proof creation dates and expiration.' },
				{ level: 'MUST', text: 'Handle signature verification failures gracefully.' },
				{ level: 'MUST', text: 'Implement Bitstring Status List verification.' },
				{ level: 'MUST', text: 'Validate status-list signature and freshness.' },
				{ level: 'MUST', text: 'Handle status-service unavailability.' },
				{ level: 'MUST', text: 'Cache status information appropriately.' },
				{
					level: 'MUST',
					text: 'Integrate with trust registries to query issuer authorization and revocation.'
				},
				{
					level: 'MUST',
					text: 'Implement protection against replay attacks, credential forgery, and status-list manipulation.'
				},
				{ level: 'MUST', text: 'Encrypt web-service endpoints with at least TLS 1.2.' },
				{ level: 'SHOULD', text: 'Implement proper error logging and reporting.' },
				{ level: 'SHOULD', text: 'Maintain current trust registry data.' }
			]
		}
	]
});

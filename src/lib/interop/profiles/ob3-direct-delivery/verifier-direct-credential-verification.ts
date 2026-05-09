import { WorkflowChecklist } from '../../profile-schema.js';

/** Verifier × Direct Credential Verification × OB 3.0 Direct Delivery. */
export const verifierDirectCredentialVerification = WorkflowChecklist({
	role: 'verifier',
	workflow: 'direct-credential-verification',
	profile: 'ob3-direct-delivery',
	steps: [
		{
			title: 'Import the credential',
			summary:
				'Accept a credential as a JSON file upload or copy-paste JSON text. Validate JSON structure before further processing and handle malformed inputs gracefully.',
			requirements: [
				{ level: 'MUST', text: 'Accept credentials as JSON files.' },
				{ level: 'MUST', text: 'Accept credentials as copy-paste JSON text.' },
				{ level: 'MUST', text: 'Validate JSON structure before processing.' },
				{ level: 'MUST', text: 'Handle malformed credentials gracefully.' }
			]
		},
		{
			title: 'Validate credential structure',
			summary:
				'Validate VCDM 2.0 + Open Badges 3.0 schema, required fields, and credential expiration. Surface clear validation errors.',
			requirements: [
				{
					level: 'MUST',
					text: 'Validate VCDM 2.0 + Open Badges 3.0 schema, required fields, and credential expiration.'
				},
				{
					level: 'MUST',
					text: 'Implement comprehensive validation error handling.'
				}
			]
		},
		{
			title: 'Verify the signature',
			summary:
				'Extract the proof, resolve the issuer DID, verify the eddsa-rdfc-2022 signature, and validate proof creation date and expiration. Handle verification failures gracefully.',
			requirements: [
				{ level: 'MUST', text: 'Verify eddsa-rdfc-2022 signatures.' },
				{
					level: 'MUST',
					text: 'Resolve issuer DIDs to obtain verification keys.'
				},
				{ level: 'MUST', text: 'Validate proof creation dates and expiration.' },
				{ level: 'MUST', text: 'Handle signature-verification failures gracefully.' }
			]
		},
		{
			title: 'Verify status',
			summary:
				'Retrieve the issuer’s Bitstring Status List, check the credential’s status, validate the list’s signature and freshness, and handle outages with appropriate caching.',
			requirements: [
				{ level: 'MUST', text: 'Implement Bitstring Status List verification.' },
				{ level: 'MUST', text: 'Validate status-list signature and freshness.' },
				{ level: 'MUST', text: 'Handle status-service unavailability.' },
				{ level: 'MUST', text: 'Cache status information appropriately.' }
			]
		},
		{
			title: 'Verify recipient identity',
			summary:
				'Extract the email-based credentialSubject identifier and compare it to the authenticated user. Send an email confirmation code if needed; provide clear guidance when proof of control is not possible.',
			requirements: [
				{
					level: 'MUST',
					text: 'Extract identifiers from credentialSubject.'
				},
				{
					level: 'MUST',
					text: 'Compare credential identifiers to authenticated user identifiers.'
				},
				{
					level: 'SHOULD',
					text: 'Send email confirmation codes when email verification is required.'
				},
				{
					level: 'SHOULD',
					text: 'Handle cases where the email address in the credential is no longer accessible to the user.'
				},
				{
					level: 'SHOULD',
					text: 'Provide clear guidance when strong proof of control verification cannot be achieved.'
				}
			]
		},
		{
			title: 'Validate issuer authorization',
			summary:
				'Query trust registries to confirm the issuer is authorized, accredited, and not revoked. Implement common attack mitigations.',
			requirements: [
				{
					level: 'MUST',
					text: 'Integrate with trust registries to query issuer authorization, accreditation, and revocation.'
				},
				{
					level: 'MUST',
					text: 'Implement protection against replay attacks, credential forgery, and status-list manipulation.'
				},
				{ level: 'SHOULD', text: 'Implement proper error logging and reporting.' },
				{ level: 'SHOULD', text: 'Maintain current trust registry data.' }
			]
		}
	]
});

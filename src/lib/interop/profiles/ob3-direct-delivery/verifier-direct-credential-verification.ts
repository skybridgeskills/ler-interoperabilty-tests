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
				{
					id: 'ob3-direct-delivery.verifier-accept-json-file',
					level: 'MUST',
					text: 'Accept credentials as JSON files.'
				},
				{
					id: 'ob3-direct-delivery.verifier-accept-json-text',
					level: 'MUST',
					text: 'Accept credentials as copy-paste JSON text.'
				},
				{
					id: 'ob3-direct-delivery.verifier-validate-json',
					level: 'MUST',
					text: 'Validate JSON structure before processing.'
				},
				{
					id: 'ob3-direct-delivery.verifier-handle-malformed',
					level: 'MUST',
					text: 'Handle malformed credentials gracefully.'
				}
			]
		},
		{
			title: 'Validate credential structure',
			summary:
				'Validate VCDM 2.0 + Open Badges 3.0 schema, required fields, and credential expiration. Surface clear validation errors.',
			requirements: [
				{
					id: 'ob3-direct-delivery.verifier-credential-schema',
					level: 'MUST',
					text: 'Validate VCDM 2.0 + Open Badges 3.0 schema, required fields, and credential expiration.'
				},
				{
					id: 'ob3-direct-delivery.verifier-validation-error-handling',
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
				{
					id: 'ob3-direct-delivery.verifier-verify-signature',
					level: 'MUST',
					text: 'Verify eddsa-rdfc-2022 signatures.'
				},
				{
					id: 'ob3-direct-delivery.verifier-resolve-issuer-dids',
					level: 'MUST',
					text: 'Resolve issuer DIDs to obtain verification keys.'
				},
				{
					id: 'ob3-direct-delivery.verifier-validate-dates',
					level: 'MUST',
					text: 'Validate proof creation dates and expiration.'
				},
				{
					id: 'ob3-direct-delivery.verifier-signature-failure-handling',
					level: 'MUST',
					text: 'Handle signature-verification failures gracefully.'
				}
			]
		},
		{
			title: 'Verify status',
			summary:
				'Retrieve the issuer’s Bitstring Status List, check the credential’s status, validate the list’s signature and freshness, and handle outages with appropriate caching.',
			requirements: [
				{
					id: 'ob3-direct-delivery.verifier-status-list',
					level: 'MUST',
					text: 'Implement Bitstring Status List verification.'
				},
				{
					id: 'ob3-direct-delivery.verifier-status-list-freshness',
					level: 'MUST',
					text: 'Validate status-list signature and freshness.'
				},
				{
					id: 'ob3-direct-delivery.verifier-status-service-unavailability',
					level: 'MUST',
					text: 'Handle status-service unavailability.'
				},
				{
					id: 'ob3-direct-delivery.verifier-cache-status',
					level: 'MUST',
					text: 'Cache status information appropriately.'
				}
			]
		},
		{
			title: 'Verify recipient identity',
			summary:
				'Extract the email-based credentialSubject identifier and compare it to the authenticated user. Send an email confirmation code if needed; provide clear guidance when proof of control is not possible.',
			requirements: [
				{
					id: 'ob3-direct-delivery.verifier-extract-identifiers',
					level: 'MUST',
					text: 'Extract identifiers from credentialSubject.'
				},
				{
					id: 'ob3-direct-delivery.verifier-compare-identifiers',
					level: 'MUST',
					text: 'Compare credential identifiers to authenticated user identifiers.'
				},
				{
					id: 'ob3-direct-delivery.verifier-email-confirmation',
					level: 'SHOULD',
					text: 'Send email confirmation codes when email verification is required.'
				},
				{
					id: 'ob3-direct-delivery.verifier-email-inaccessible',
					level: 'SHOULD',
					text: 'Handle cases where the email address in the credential is no longer accessible to the user.'
				},
				{
					id: 'ob3-direct-delivery.verifier-proof-of-control-guidance',
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
					id: 'ob3-direct-delivery.verifier-trust-registry',
					level: 'MUST',
					text: 'Integrate with trust registries to query issuer authorization, accreditation, and revocation.'
				},
				{
					id: 'ob3-direct-delivery.verifier-attack-protection',
					level: 'MUST',
					text: 'Implement protection against replay attacks, credential forgery, and status-list manipulation.'
				},
				{
					id: 'ob3-direct-delivery.verifier-error-logging',
					level: 'SHOULD',
					text: 'Implement proper error logging and reporting.'
				},
				{
					id: 'ob3-direct-delivery.verifier-trust-registry-maintenance',
					level: 'SHOULD',
					text: 'Maintain current trust registry data.'
				}
			]
		},
		{
			title: 'Demonstrate verification outcomes',
			summary:
				'Run the verification check: the suite’s test wallet hands your verifier a valid credential and several defective ones. Report what your verifier decided for each.',
			requirements: [
				{
					id: 'ob3-direct-delivery.verifier-accepts-valid-credential',
					level: 'MUST',
					text: 'Accept a valid credential.'
				},
				{
					id: 'ob3-direct-delivery.verifier-rejects-broken-signature',
					level: 'MUST',
					text: 'Reject a credential whose signature does not verify.'
				},
				{
					id: 'ob3-direct-delivery.verifier-rejects-schema-problem',
					level: 'MUST',
					text: 'Reject a credential that fails schema validation.'
				},
				{
					id: 'ob3-direct-delivery.verifier-rejects-expired',
					level: 'MUST',
					text: 'Reject an expired credential.'
				},
				{
					id: 'ob3-direct-delivery.verifier-rejects-revoked',
					level: 'MUST',
					text: 'Reject a revoked credential.'
				}
			]
		}
	]
});

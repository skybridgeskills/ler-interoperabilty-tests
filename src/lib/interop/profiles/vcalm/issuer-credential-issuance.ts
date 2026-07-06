import { WorkflowChecklist } from '../../profile-schema.js';

/**
 * Issuer × Credential Issuance × VCALM.
 *
 * Requirement `id`s are namespaced `vcalm.issuer.credential-issuance.*` and drive the test-wallet
 * issuer-flow check registry (`server/domain/wallet-runner/checks/vcalm-issuer-flow.ts`). Two
 * clauses the test wallet cannot honestly verify on the happy path are reframed: the QR/copyable
 * exposure is self-attested (the automatable meaning is "the pasted interaction URL is
 * fetchable"), and the ProblemDetails error-handling clauses resolve to `n/a` (they need a
 * negative probe, which is out of scope).
 */
export const issuerCredentialIssuance = WorkflowChecklist({
	role: 'issuer',
	workflow: 'credential-issuance',
	profile: 'vcalm',
	steps: [
		{
			title: 'Create exchange and expose interaction URL',
			summary:
				'Create a VCALM exchange when the user has earned a badge. Expose the interaction URL via QR code, deep link, or copy-paste so the holder wallet can fetch it.',
			requirements: [
				{
					id: 'vcalm.issuer.credential-issuance.interaction-url-fetchable',
					level: 'MUST',
					text: 'Expose the interaction URL — as a QR code (cross-device) and a copyable URL (same-device). The test wallet fetches the URL you paste and confirms it returns the VCALM interaction protocols; the QR/copyable affordances themselves are self-attested.'
				},
				{
					id: 'vcalm.issuer.credential-issuance.participation-endpoint',
					level: 'MUST',
					text: 'Implement the VCALM Exchanges exchange-participation endpoint.'
				},
				{
					id: 'vcalm.issuer.credential-issuance.tls',
					level: 'MUST',
					text: 'Encrypt web-service endpoints with at least TLS 1.2.'
				}
			]
		},
		{
			title: 'Respond to the interaction-URL fetch',
			summary:
				'Return the protocols list including the `vcapi` interaction URL so the holder can advance to the exchange.',
			requirements: [
				{
					id: 'vcalm.issuer.credential-issuance.participation-problemdetails',
					level: 'MUST',
					text: 'Implement the VCALM Exchanges participation endpoint with ProblemDetails error handling.'
				},
				{
					id: 'vcalm.issuer.credential-issuance.vcapi-in-protocols',
					level: 'MUST',
					text: 'Include `vcapi` in the Interaction Protocols response.'
				}
			]
		},
		{
			title: 'Handle the empty POST and request DIDAuthentication',
			summary:
				'When the holder POSTs `{}` to the exchange, respond with a `verifiablePresentationRequest` containing a `DIDAuthentication` query so the holder proves control of their DID.',
			requirements: [
				{
					id: 'vcalm.issuer.credential-issuance.didauth-requested',
					level: 'MUST',
					text: 'Include a `DIDAuthentication` query in the `verifiablePresentationRequest`’s `query` array.'
				},
				{
					id: 'vcalm.issuer.credential-issuance.didauth-problemdetails',
					level: 'MUST',
					text: 'Express any errors as ProblemDetails objects.'
				}
			]
		},
		{
			title: 'Receive DIDAuthentication, create credential, and deliver it',
			summary:
				'Validate the DIDAuthentication presentation (see the data-integrity-cryptosuites additive profile for supported VP cryptosuites), build the Open Badges 3.0 credential addressed to the verified holder DID, sign it with a supported cryptosuite, allocate a status list index, and return it inside a verifiablePresentation.',
			requirements: [
				{
					id: 'vcalm.issuer.credential-issuance.binds-verified-holder',
					level: 'MUST',
					text: 'Validate the holder’s DIDAuthentication verifiablePresentation: a Data Integrity proof with `proofPurpose` `authentication`, a `challenge` matching the issued `verifiablePresentationRequest`, and holder control of the verification-method key — before binding `credentialSubject.id`.'
				},
				{
					id: 'vcalm.issuer.credential-issuance.vcdm-2',
					level: 'MUST',
					text: 'Generate W3C Verifiable Credentials Data Model 2.0-compliant credentials.'
				},
				{
					id: 'vcalm.issuer.credential-issuance.openbadge-3',
					level: 'MUST',
					text: 'Use the `OpenBadgeCredential` type and comply with the Open Badges 3.0 schema, including all mandatory fields.'
				},
				{
					id: 'vcalm.issuer.credential-issuance.di-proof',
					level: 'MUST',
					text: 'Use a Data Integrity Proof whose cryptosuite is declared by the data-integrity-cryptosuites additive profile, including proof creation date and verification-method reference.'
				},
				{
					id: 'vcalm.issuer.credential-issuance.status-list',
					level: 'MUST',
					text: 'Maintain a current Bitstring Status List signed with the issuer key and reference it via BitStringStatusList in `credentialStatus`.'
				},
				{
					id: 'vcalm.issuer.credential-issuance.issuer-did',
					level: 'MUST',
					text: 'Use a did:web or did:key issuer identifier whose verification method matches the chosen cryptosuite (key-type per data-integrity-cryptosuites additive) and resolves correctly.'
				},
				{
					id: 'vcalm.issuer.credential-issuance.valid-until',
					level: 'SHOULD',
					text: 'Support credential expiration via `validUntil`.'
				}
			]
		}
	]
});

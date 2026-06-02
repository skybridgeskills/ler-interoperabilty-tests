/**
 * A bundled Open Badges 3 credential template the runner sends to the
 * transaction service when initiating an issuance exchange. The template
 * is **unsigned** — the signing service signs it during the exchange,
 * binding `credentialSubject.id` to the holder DID asserted in the
 * DIDAuth presentation.
 *
 * The template uses `{{HOLDER_DID}}` as a placeholder so the
 * transaction service can substitute the verified holder DID at issue
 * time. (If the underlying service template engine differs, swap the
 * delimiters here without touching call sites.)
 */
export function ob3CredentialTemplate(retrievalId: string): Record<string, unknown> {
	return {
		'@context': [
			'https://www.w3.org/ns/credentials/v2',
			'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json'
		],
		id: `urn:uuid:${retrievalId}`,
		type: ['VerifiableCredential', 'OpenBadgeCredential'],
		name: 'LER Interop Test Credential',
		description:
			'A sample Open Badges 3 credential issued by the LER Interoperability Test Suite to exercise wallet acceptance.',
		issuer: {
			id: 'did:key:placeholder',
			type: ['Profile'],
			name: 'LER Interoperability Test Suite (dev)'
		},
		validFrom: '2026-01-01T00:00:00Z',
		credentialSubject: {
			id: '{{HOLDER_DID}}',
			type: ['AchievementSubject'],
			achievement: {
				id: 'urn:uuid:lits-interop-test-achievement',
				type: ['Achievement'],
				name: 'Demonstrated VCALM-EdDSA wallet acceptance',
				description:
					'Holder successfully completed a VC-API exchange against a local DCC transaction service and accepted the issued credential.',
				criteria: {
					narrative:
						'Open the LER Interoperability Test Suite, scan or paste the interaction URL into the wallet under test, and complete the DIDAuth exchange.'
				}
			}
		}
	};
}

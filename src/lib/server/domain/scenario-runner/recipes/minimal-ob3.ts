import type { CredentialRecipe } from '../credential-recipes.js';

/**
 * A minimal, well-formed Open Badges 3.0 credential — the happy-path control
 * every discrimination scenario measures against.
 *
 * The document is **unsigned**; the signing service signs it during the
 * exchange. Four fields here are placeholders the services overwrite and a
 * recipe must not rely on: `credentialSubject.id` (bound to the holder DID
 * asserted in the DIDAuth presentation), `issuer.id` (derived from the tenant
 * seed — an *object* issuer keeps its `name`, only `.id` is replaced),
 * `credentialStatus` (attached by the status service, never hand-crafted), and
 * `proof`.
 */
export const minimalOb3: CredentialRecipe = {
	id: 'minimal-ob3',
	summary: 'A well-formed Open Badges 3.0 credential with nothing unusual about it.',
	build: ({ credentialId }) => ({
		'@context': [
			'https://www.w3.org/ns/credentials/v2',
			'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json'
		],
		id: credentialId,
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
				name: 'Demonstrated wallet acceptance of an Open Badges credential',
				description:
					'Holder completed an exchange against the LER Interoperability Test Suite and accepted the issued credential.',
				criteria: {
					narrative:
						'Open the LER Interoperability Test Suite, scan or paste the interaction URL into the wallet under test, and complete the exchange.'
				}
			}
		}
	})
};

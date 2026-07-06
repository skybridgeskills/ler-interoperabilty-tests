import { randomUUID } from 'node:crypto';

/**
 * The unsigned body of a minimal, schema-valid Open Badges 3.0 credential —
 * the shared fixture behind the verifier acceptance passes' valid control and
 * the wallet-client seed credential. It carries the OB3-required fields a
 * conformant verifier checks: a `Profile` issuer, `validFrom`, and a complete
 * `credentialSubject.achievement` (`id`, `type`, `name`, `description`,
 * `criteria`). Mirrors the shape of the exchange-runner's
 * `ob3CredentialTemplate`, with a fresh issuer/holder did:key rather than a
 * transaction-service placeholder.
 *
 * The caller signs it with the issuer key (verification resolves the proof's
 * `verificationMethod`, independent of the `issuer` field). `id` and
 * `validFrom` default to a fresh `urn:uuid` and issue time; both are
 * overridable (e.g. the expired pass overrides `validFrom`).
 */
export function minimalOpenBadgeCredential(args: {
	issuerDid: string;
	holderDid: string;
	issuerName?: string;
	id?: string;
	validFrom?: string;
}): Record<string, unknown> {
	const {
		issuerDid,
		holderDid,
		issuerName = 'LER Interoperability Test Suite (dev)',
		id = `urn:uuid:${randomUUID()}`,
		validFrom = isoSeconds(new Date())
	} = args;
	return {
		'@context': [
			'https://www.w3.org/ns/credentials/v2',
			'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json'
		],
		id,
		type: ['VerifiableCredential', 'OpenBadgeCredential'],
		name: 'LER Interop Test Credential',
		description:
			'A minimal Open Badges 3.0 credential issued by the LER Interoperability Test Suite as the valid control in a verifier acceptance run.',
		issuer: { id: issuerDid, type: ['Profile'], name: issuerName },
		validFrom,
		credentialSubject: {
			id: holderDid,
			type: ['AchievementSubject'],
			achievement: {
				id: 'urn:uuid:lits-interop-test-achievement',
				type: ['Achievement'],
				name: 'LER Interop Test Achievement',
				description:
					'Recognizes a successful interoperability exchange in the LER Interoperability Test Suite.',
				criteria: {
					narrative:
						'Awarded automatically by the test suite as the valid control credential for verifier acceptance testing.'
				}
			}
		}
	};
}

/** XML-dateTime-friendly ISO string without milliseconds. */
function isoSeconds(date: Date): string {
	return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

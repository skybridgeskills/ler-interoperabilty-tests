import {
	PassKind,
	type PassDefinition,
	type VerifierRunDefinition
} from '$lib/interop/verifier-run/index.js';
import type { WalletCryptosuite } from '$lib/server/domain/wallet-crypto/index.js';

/**
 * Deterministic run generation for tests + stories: no crypto, no
 * shuffle. Passes come in enum order (`valid`, `broken-signature`,
 * `schema-problem`, `expired`) with stable ids and canned credential
 * JSON per kind; scoring on top of a fake run is the real engine.
 */
export async function fakeGenerateRun(args: {
	cryptosuite: WalletCryptosuite;
}): Promise<VerifierRunDefinition> {
	const passes: PassDefinition[] = PassKind.schema.options.map((kind, index) => ({
		passId: `fake-pass-${index + 1}`,
		label: `Credential ${index + 1}`,
		kind,
		credential: fakeCredential(kind, args.cryptosuite)
	}));
	return {
		runId: 'fake-verifier-run-1',
		profile: 'ob3-direct-delivery',
		workflow: 'direct-credential-verification',
		cryptosuite: args.cryptosuite,
		passes
	};
}

function fakeCredential(kind: PassKind, cryptosuite: string): Record<string, unknown> {
	return {
		'@context': [
			'https://www.w3.org/ns/credentials/v2',
			'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json'
		],
		type: ['VerifiableCredential', 'OpenBadgeCredential'],
		issuer: 'did:example:fake-issuer',
		validFrom: '2026-01-01T00:00:00Z',
		...(kind === 'expired' ? { validUntil: '2026-02-01T00:00:00Z' } : {}),
		credentialSubject: {
			id: 'did:example:fake-holder',
			...(kind === 'schema-problem' ? {} : { type: 'AchievementSubject' })
		},
		proof: {
			type: 'DataIntegrityProof',
			cryptosuite,
			proofValue: kind === 'broken-signature' ? 'z1FakeTamperedProof' : 'z1FakeProof'
		}
	};
}

import { describe, expect, it } from 'vitest';

import { WalletCrypto, type WalletCryptosuite } from '$lib/server/domain/wallet-crypto/index.js';

import { matchCredential } from './match.js';
import { Oid4vpAuthorizationRequest } from './schemas.js';
import { seedHeldCredential } from './seed-credential.js';

function obRequest(typeConst = 'OpenBadgeCredential') {
	return {
		client_id: 'https://verifier.test',
		response_uri: 'https://verifier.test/oid4vp/response',
		response_mode: 'direct_post' as const,
		nonce: 'nonce-123',
		presentation_definition: {
			id: 'ob3-def',
			input_descriptors: [
				{
					id: 'ob3',
					constraints: {
						fields: [
							{ path: ['$.type'], filter: { type: 'array', contains: { const: typeConst } } }
						]
					}
				}
			]
		}
	};
}

describe('Oid4vpAuthorizationRequest', () => {
	it('parses a valid direct_post request', () => {
		const parsed = Oid4vpAuthorizationRequest(obRequest());
		expect(parsed.client_id).toBe('https://verifier.test');
		expect(parsed.presentation_definition.input_descriptors).toHaveLength(1);
	});

	it('rejects a malformed request (missing response_uri / wrong mode)', () => {
		// Intentionally malformed runtime inputs (cast past the typed factory signature).
		expect(() =>
			Oid4vpAuthorizationRequest({ ...obRequest(), response_uri: undefined } as never)
		).toThrow();
		expect(() =>
			Oid4vpAuthorizationRequest({ ...obRequest(), response_mode: 'fragment' } as never)
		).toThrow();
	});
});

const CRYPTOSUITES: WalletCryptosuite[] = ['eddsa-rdfc-2022', 'ecdsa-rdfc-2019'];

describe('seedHeldCredential', () => {
	for (const cs of CRYPTOSUITES) {
		it(`issues a verifiable OB3 credential bound to the holder DID (${cs})`, async () => {
			const crypto = WalletCrypto();
			const { credential, holder } = await seedHeldCredential(crypto, cs);
			const c = credential as { type: string[]; credentialSubject: { id: string } };
			expect(c.type).toContain('OpenBadgeCredential');
			expect(c.credentialSubject.id).toBe(holder.did);
			const verify = await crypto.verifyCredential(credential);
			expect(verify.verified).toBe(true);
		});
	}
});

describe('matchCredential', () => {
	it('matches an OpenBadgeCredential request and builds a presentation_submission', () => {
		const request = Oid4vpAuthorizationRequest(obRequest());
		const credential = { type: ['VerifiableCredential', 'OpenBadgeCredential'] };
		const result = matchCredential(request, credential);
		expect(result.matches).toBe(true);
		if (result.matches) {
			expect(result.submission.definition_id).toBe('ob3-def');
			expect(result.submission.descriptor_map).toEqual([
				{ id: 'ob3', format: 'ldp_vp', path: '$' }
			]);
		}
	});

	it('does not match when the request requires a different type', () => {
		const request = Oid4vpAuthorizationRequest(obRequest('SomeOtherCredential'));
		const credential = { type: ['VerifiableCredential', 'OpenBadgeCredential'] };
		const result = matchCredential(request, credential);
		expect(result.matches).toBe(false);
	});
});

import { describe, expect, it } from 'vitest';

import { WalletCrypto, type WalletCryptosuite } from '$lib/server/domain/wallet-crypto/index.js';

import { buildPassCredential } from './build-pass.js';

/**
 * The fixture honesty contract: valid / schema-problem / expired pass
 * credentials VERIFY cryptographically; broken-signature FAILS. Proven
 * for both supported cryptosuites.
 */
describe.each<WalletCryptosuite>(['eddsa-rdfc-2022', 'ecdsa-rdfc-2019'])(
	'buildPassCredential honesty contract (%s)',
	{ timeout: 60_000 },
	(cryptosuite) => {
		const crypto = WalletCrypto();

		it('valid: signature verifies', async () => {
			const credential = await buildPassCredential(crypto, cryptosuite, 'valid');
			const result = await crypto.verifyCredential(credential);
			expect(result.errors).toEqual([]);
			expect(result.verified).toBe(true);
		});

		it('schema-problem: defect is present yet the signature verifies', async () => {
			const credential = await buildPassCredential(crypto, cryptosuite, 'schema-problem');
			const subject = (credential as { credentialSubject: Record<string, unknown> })
				.credentialSubject;
			expect(subject.type).toBeUndefined();

			const result = await crypto.verifyCredential(credential);
			expect(result.errors).toEqual([]);
			expect(result.verified).toBe(true);
		});

		it('expired: signature verifies inside the validity window', async () => {
			const credential = await buildPassCredential(crypto, cryptosuite, 'expired');
			const { validFrom, validUntil } = credential as { validFrom: string; validUntil: string };
			expect(new Date(validUntil).getTime()).toBeLessThan(Date.now());

			// Cryptographically valid: verifying with a clock inside the window succeeds.
			const inWindow = new Date(
				(new Date(validFrom).getTime() + new Date(validUntil).getTime()) / 2
			);
			const result = await crypto.verifyCredential(credential, { now: inWindow });
			expect(result.errors).toEqual([]);
			expect(result.verified).toBe(true);
		});

		it('expired: fails verification NOW for expiry, not for the signature', async () => {
			const credential = await buildPassCredential(crypto, cryptosuite, 'expired');
			const result = await crypto.verifyCredential(credential);
			expect(result.verified).toBe(false);
			expect(result.errors?.join(' ')).toMatch(/validUntil/);
		});

		it('broken-signature: signature fails verification', async () => {
			const credential = await buildPassCredential(crypto, cryptosuite, 'broken-signature');
			const result = await crypto.verifyCredential(credential);
			expect(result.verified).toBe(false);
		});
	}
);

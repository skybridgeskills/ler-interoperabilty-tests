import { describe, expect, it } from 'vitest';

import { PassKind } from '$lib/interop/verifier-run/index.js';
import { WalletCrypto, type WalletCryptosuite } from '$lib/server/domain/wallet-crypto/index.js';

import { buildPassCredential } from './build-pass.js';

/**
 * The fixture honesty contract: valid / schema-problem / expired pass
 * credentials VERIFY cryptographically; broken-signature FAILS. Every
 * kind returns the holder key bound to `credentialSubject.id`. Proven
 * for both supported cryptosuites.
 */
describe.each<WalletCryptosuite>(['eddsa-rdfc-2022', 'ecdsa-rdfc-2019'])(
	'buildPassCredential honesty contract (%s)',
	{ timeout: 60_000 },
	(cryptosuite) => {
		const crypto = WalletCrypto();

		it('valid: schema-complete OB3 whose signature verifies', async () => {
			const { credential } = await buildPassCredential(crypto, cryptosuite, 'valid');

			// The valid control is a genuine minimal OB3: a Profile issuer and a
			// complete Achievement (so a conformant verifier accepts it on schema).
			const c = credential as {
				issuer: { type: string[] };
				credentialSubject: { achievement?: { criteria?: unknown } };
			};
			expect(c.issuer.type).toContain('Profile');
			expect(c.credentialSubject.achievement?.criteria).toBeDefined();

			const result = await crypto.verifyCredential(credential);
			expect(result.errors).toEqual([]);
			expect(result.verified).toBe(true);
		});

		it('schema-problem: missing required Achievement criteria yet the signature verifies', async () => {
			const { credential } = await buildPassCredential(crypto, cryptosuite, 'schema-problem');
			const subject = (
				credential as { credentialSubject: { achievement: Record<string, unknown> } }
			).credentialSubject;
			// The Achievement is present but OB3-invalid: its required `criteria` is gone.
			expect(subject.achievement).toBeDefined();
			expect(subject.achievement.criteria).toBeUndefined();
			expect(subject.achievement.name).toBeDefined();

			const result = await crypto.verifyCredential(credential);
			expect(result.errors).toEqual([]);
			expect(result.verified).toBe(true);
		});

		it('expired: signature verifies inside the validity window', async () => {
			const { credential } = await buildPassCredential(crypto, cryptosuite, 'expired');
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
			const { credential } = await buildPassCredential(crypto, cryptosuite, 'expired');
			const result = await crypto.verifyCredential(credential);
			expect(result.verified).toBe(false);
			expect(result.errors?.join(' ')).toMatch(/validUntil/);
		});

		it('broken-signature: signature fails verification', async () => {
			const { credential } = await buildPassCredential(crypto, cryptosuite, 'broken-signature');
			const result = await crypto.verifyCredential(credential);
			expect(result.verified).toBe(false);
		});
	}
);

describe('buildPassCredential holder binding (eddsa-rdfc-2022)', { timeout: 60_000 }, () => {
	const crypto = WalletCrypto();

	it.each(PassKind.schema.options)(
		'%s: returns the holder key whose DID is credentialSubject.id',
		async (kind) => {
			const { credential, holder } = await buildPassCredential(crypto, 'eddsa-rdfc-2022', kind);
			const subject = (credential as { credentialSubject: { id: string } }).credentialSubject;
			expect(holder.did).toMatch(/^did:key:/);
			expect(subject.id).toBe(holder.did);
			expect(holder.cryptosuite).toBe('eddsa-rdfc-2022');
		}
	);
});

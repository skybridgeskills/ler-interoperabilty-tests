import { describe, expect, it } from 'vitest';

import { WalletCrypto, type WalletCryptosuite } from '$lib/server/domain/wallet-crypto/index.js';

import { recipeById } from './credential-recipes.js';
import { signDeliverable } from './sign-deliverable.js';

/**
 * The deliver-direct signing honesty contract, mirroring `build-pass.test.ts`:
 * an untampered deliverable VERIFIES over the exact document handed out, and the
 * recipe's placeholder issuer/subject DIDs are bound to real ephemeral keys.
 * `tamper: 'proof'` makes the signature fail; `tamper: 'claim'` corrupts a
 * signature-covered value while the proof stays structurally intact.
 */
function docFor(id: string): Record<string, unknown> {
	const recipe = recipeById(id);
	if (!recipe) throw new Error(`missing recipe ${id}`);
	return recipe.build({ credentialId: 'urn:uuid:sign-deliverable-test' });
}

describe.each<WalletCryptosuite>(['eddsa-rdfc-2022', 'ecdsa-rdfc-2019'])(
	'signDeliverable honesty contract (%s)',
	{ timeout: 60_000 },
	(cryptosuite) => {
		const crypto = WalletCrypto();

		it('untampered: binds the placeholders and the signature verifies', async () => {
			const credential = (await signDeliverable(crypto, {
				doc: docFor('minimal-ob3'),
				cryptosuite
			})) as {
				issuer: { id: string };
				credentialSubject: { id: string };
			};

			// The recipe placeholders are gone, replaced by resolvable did:keys.
			expect(credential.issuer.id).toMatch(/^did:key:/);
			expect(credential.credentialSubject.id).toMatch(/^did:key:/);
			expect(credential.credentialSubject.id).not.toBe('{{HOLDER_DID}}');

			const result = await crypto.verifyCredential(credential);
			expect(result.errors).toEqual([]);
			expect(result.verified).toBe(true);
		});

		it("tamper 'proof': the signature fails verification", async () => {
			const credential = await signDeliverable(crypto, {
				doc: docFor('minimal-ob3'),
				cryptosuite,
				tamper: 'proof'
			});
			const result = await crypto.verifyCredential(credential);
			expect(result.verified).toBe(false);
		});

		it("tamper 'claim': a covered value changed, so verification fails", async () => {
			const credential = (await signDeliverable(crypto, {
				doc: docFor('minimal-ob3'),
				cryptosuite,
				tamper: 'claim'
			})) as { name: string; proof: unknown };

			// The proof is still present and structurally intact...
			expect(credential.proof).toBeDefined();
			// ...but `name` was mutated after signing, so the proof no longer matches.
			expect(credential.name.endsWith(' ')).toBe(true);
			const result = await crypto.verifyCredential(credential);
			expect(result.verified).toBe(false);
		});
	}
);

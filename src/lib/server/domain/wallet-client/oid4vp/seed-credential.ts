import { minimalOpenBadgeCredential } from '$lib/server/domain/credential-fixtures/minimal-open-badge-credential.js';
import type {
	WalletCrypto,
	WalletCryptosuite,
	WalletKey
} from '$lib/server/domain/wallet-crypto/index.js';

/** A held credential bound to the holder key that will present it. */
export type HeldCredential = {
	credential: unknown;
	holder: WalletKey;
};

/**
 * Seed a held OB3 credential on demand: generate a fresh holder key, issue a
 * minimal schema-valid OpenBadgeCredential to it via a fixture issuer key, and return both. The holder key is what
 * later signs the presentation; the credential subject is the holder DID. Hermetic + stateless
 * — there is no persistent wallet store (see the M5 plan's seed-on-demand decision).
 */
export async function seedHeldCredential(
	crypto: WalletCrypto,
	cryptosuite: WalletCryptosuite
): Promise<HeldCredential> {
	const issuer = await crypto.generateKey(cryptosuite);
	const holder = await crypto.generateKey(cryptosuite);
	const credential = await crypto.issueCredential({
		issuer,
		credential: minimalOpenBadgeCredential({ issuerDid: issuer.did, holderDid: holder.did })
	});
	return { credential, holder };
}

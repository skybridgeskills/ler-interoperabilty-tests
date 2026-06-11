import { suiteConfigFor, type MultikeyPair, type WalletCryptosuite } from './cryptosuite.js';
import type { DidKeyDriver } from './document-loader.js';

/**
 * An ephemeral holder (or issuer) key bound to a freshly generated `did:key`. Holds the
 * cryptosuite-specific signer used to build data-integrity proofs. Server-only, in-memory —
 * never serialized or persisted.
 */
export interface WalletKey {
	did: string;
	verificationMethod: string;
	cryptosuite: WalletCryptosuite;
	/** Signer consumed by `DataIntegrityProof`; opaque to callers. */
	signer: unknown;
}

/**
 * Generate a fresh ephemeral `did:key` keypair for the given cryptosuite (Ed25519 for
 * `eddsa-rdfc-2022`, P-256 for `ecdsa-rdfc-2019`) and bind its id/controller to the did:key.
 */
export async function generateWalletKey(
	driver: DidKeyDriver,
	cryptosuite: WalletCryptosuite
): Promise<WalletKey> {
	const { multikey, curve } = suiteConfigFor(cryptosuite);
	const key: MultikeyPair = await multikey.generate(curve ? { curve } : {});
	const { didDocument } = await driver.fromKeyPair({ verificationKeyPair: key });
	const vm = didDocument.verificationMethod[0];
	// Bind id + controller before deriving the signer so the proof's verificationMethod resolves.
	key.id = vm.id;
	key.controller = didDocument.id;
	return {
		did: didDocument.id,
		verificationMethod: vm.id,
		cryptosuite,
		signer: key.signer()
	};
}

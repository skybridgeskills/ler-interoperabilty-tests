import type { WalletCryptosuite } from './cryptosuite.js';
import { buildWalletDocumentLoader, type DocumentLoader } from './document-loader.js';
import { generateWalletKey, type WalletKey } from './holder-key.js';
import { issueCredential, signPresentation } from './sign.js';
import { verifyCredential, verifyPresentation, type VerifyResult } from './verify.js';

export type { WalletCryptosuite } from './cryptosuite.js';
export type { WalletKey } from './holder-key.js';
export type { VerifyResult } from './verify.js';
export type { DocumentLoader } from './document-loader.js';

/**
 * Server-only crypto for the test wallet: ephemeral did:key keypairs, data-integrity proof
 * signing (eddsa-rdfc-2022 / ecdsa-rdfc-2019), VP construction, and VC/VP verification, using
 * the `@interop/*` VC stack with `@digitalbazaar/*` cryptosuites. One shared did:key driver +
 * document loader back every operation. Never import from client code.
 */
export function WalletCrypto() {
	const { documentLoader, driver } = buildWalletDocumentLoader();

	return {
		documentLoader,

		/** Generate a fresh ephemeral holder (or issuer) key for the cryptosuite. */
		generateKey(cryptosuite: WalletCryptosuite): Promise<WalletKey> {
			return generateWalletKey(driver, cryptosuite);
		},

		/** Sign a (optionally credential-bearing, optionally challenge-bound) VP. */
		signPresentation(args: {
			holder: WalletKey;
			challenge?: string;
			domain?: string;
			verifiableCredential?: unknown;
		}): Promise<unknown> {
			return signPresentation({ ...args, documentLoader });
		},

		/** Issue a signed VC (test/fake issuer only). */
		issueCredential(args: {
			issuer: WalletKey;
			credential: Record<string, unknown>;
		}): Promise<unknown> {
			return issueCredential({ ...args, documentLoader });
		},

		/** Verify a VC's data-integrity proof (`now` overrides the validity-window clock). */
		verifyCredential(credential: unknown, opts?: { now?: Date | string }): Promise<VerifyResult> {
			return verifyCredential({ credential, documentLoader, ...opts });
		},

		/** Verify a VP (challenge/domain bound for DIDAuth). */
		verifyPresentation(
			presentation: unknown,
			opts?: { challenge?: string; domain?: string }
		): Promise<VerifyResult> {
			return verifyPresentation({ presentation, documentLoader, ...opts });
		}
	};
}

export type WalletCrypto = ReturnType<typeof WalletCrypto>;

/** Shared document loader builder (exposed for advanced callers / status-list wiring). */
export { buildWalletDocumentLoader };
export type { DocumentLoader as WalletDocumentLoader };

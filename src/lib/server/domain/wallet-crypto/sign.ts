import { DataIntegrityProof } from '@interop/data-integrity-proof';
import * as vc from '@interop/vc';

import { suiteConfigFor } from './cryptosuite.js';
import type { DocumentLoader } from './document-loader.js';
import type { WalletKey } from './holder-key.js';

/**
 * Sign a Verifiable Presentation with the holder key. When `challenge`/`domain` are supplied
 * the VP answers a DIDAuthentication request (challenge-bound). When `verifiableCredential` is
 * supplied the VP carries that credential (OID4VP-style); omit it for a bare DIDAuth VP.
 */
export async function signPresentation(args: {
	holder: WalletKey;
	documentLoader: DocumentLoader;
	challenge?: string;
	domain?: string;
	verifiableCredential?: unknown;
}): Promise<unknown> {
	const { holder, documentLoader, challenge, domain, verifiableCredential } = args;
	const { cryptosuite } = suiteConfigFor(holder.cryptosuite);
	// Adapter boundary: holder.signer + the @digitalbazaar cryptosuite are loosely typed here;
	// the @interop DataIntegrityProof/vc stack supplies the precise types.
	const suite = new DataIntegrityProof({
		signer: holder.signer as never,
		cryptosuite: cryptosuite as never
	});
	const presentation = vc.createPresentation({
		holder: holder.did,
		verifiableCredential: verifiableCredential as never
	});
	return vc.signPresentation({ presentation, suite, challenge, domain, documentLoader });
}

/**
 * Issue (sign) a Verifiable Credential with an issuer key. Used by the in-memory fake issuer
 * in tests/stories so the wallet has a real signed credential to receive and verify; the
 * production issuer is an external transaction service.
 */
export async function issueCredential(args: {
	issuer: WalletKey;
	credential: Record<string, unknown>;
	documentLoader: DocumentLoader;
}): Promise<unknown> {
	const { issuer, credential, documentLoader } = args;
	const { cryptosuite } = suiteConfigFor(issuer.cryptosuite);
	const suite = new DataIntegrityProof({
		signer: issuer.signer as never,
		cryptosuite: cryptosuite as never
	});
	return vc.issue({ credential: credential as never, suite, documentLoader });
}

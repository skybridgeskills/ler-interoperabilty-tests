import { DataIntegrityProof } from '@interop/data-integrity-proof';
import * as vc from '@interop/vc';

import { WALLET_CRYPTOSUITES, suiteConfigFor } from './cryptosuite.js';
import type { DocumentLoader } from './document-loader.js';

/** Normalized result of a wallet verification. */
export type VerifyResult = {
	verified: boolean;
	cryptosuite?: string;
	issuerDid?: string;
	holderDid?: string;
	errors?: string[];
};

/** Verify suites for every supported cryptosuite (verification picks the matching one). */
function verifySuites() {
	return WALLET_CRYPTOSUITES.map(
		(name) => new DataIntegrityProof({ cryptosuite: suiteConfigFor(name).cryptosuite as never })
	);
}

function errorsOf(result: {
	error?: { errors?: { message?: string }[]; message?: string };
}): string[] {
	const e = result?.error;
	if (!e) return [];
	if (Array.isArray(e.errors) && e.errors.length) {
		return e.errors.map((x) => x?.message ?? String(x));
	}
	return [e.message ?? String(e)];
}

function issuerOf(credential: unknown): string | undefined {
	const issuer = (credential as { issuer?: unknown })?.issuer;
	if (typeof issuer === 'string') return issuer;
	if (issuer && typeof issuer === 'object') return (issuer as { id?: string }).id;
	return undefined;
}

/**
 * Verify a Verifiable Credential's data-integrity proof (issuer did:key/did:web resolvable).
 * `now` overrides the clock the `validFrom`/`validUntil` window is checked against — used by
 * fixture sanity tests to prove an intentionally expired credential still verifies
 * cryptographically inside its validity window.
 */
export async function verifyCredential(args: {
	credential: unknown;
	documentLoader: DocumentLoader;
	now?: Date | string;
}): Promise<VerifyResult> {
	const { credential, documentLoader, now } = args;
	const result = await vc.verifyCredential({
		credential: credential as never,
		suite: verifySuites(),
		documentLoader,
		...(now !== undefined ? { now } : {})
	});
	return {
		verified: !!result.verified,
		cryptosuite: (credential as { proof?: { cryptosuite?: string } })?.proof?.cryptosuite,
		issuerDid: issuerOf(credential),
		errors: errorsOf(result)
	};
}

/** Verify a Verifiable Presentation (challenge/domain bound for DIDAuth). */
export async function verifyPresentation(args: {
	presentation: unknown;
	documentLoader: DocumentLoader;
	challenge?: string;
	domain?: string;
}): Promise<VerifyResult> {
	const { presentation, documentLoader, challenge, domain } = args;
	const result = await vc.verify({
		presentation: presentation as never,
		suite: verifySuites(),
		challenge,
		domain,
		documentLoader
	});
	return {
		verified: !!result.verified,
		holderDid: (presentation as { holder?: string })?.holder,
		errors: errorsOf(result)
	};
}

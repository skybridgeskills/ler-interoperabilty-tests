import { DataIntegrityProof } from '@interop/data-integrity-proof';
import * as vc from '@interop/vc';
import { checkStatus } from '@interop/vc-bitstring-status-list';

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
 * A document loader that falls back to an HTTPS fetch for documents the wallet
 * loader does not know.
 *
 * Needed only for status checking. A Bitstring Status List credential is by
 * definition a REMOTE document — its URL comes from the credential under test
 * — so the bundled security loader, which serves a fixed set of contexts and
 * resolves did:key, cannot supply it and reports "Document not found in
 * document loader".
 *
 * Scoped deliberately: the fallback is only wired into the status check, and
 * only for `https:`. Fetching a URL named inside a credential is a request
 * made on that credential's say-so, which is exactly the kind of reach a
 * general-purpose loader should not have.
 */
const statusListLoader =
	(base: DocumentLoader): DocumentLoader =>
	async (url: string) => {
		try {
			return await base(url);
		} catch (e) {
			if (!url.startsWith('https:')) throw e;
			const res = await fetch(url, { headers: { Accept: 'application/json' } });
			if (!res.ok) throw new Error(`status list fetch ${url} responded ${res.status}`);
			return { contextUrl: null, documentUrl: url, document: await res.json() };
		}
	};

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
	/**
	 * Skip the Bitstring Status List check. Off by default — see below for why
	 * checking is the right default — but available for a credential whose
	 * status list is deliberately unreachable, where the interesting verdict is
	 * the signature and not the status.
	 */
	skipStatusCheck?: boolean;
}): Promise<VerifyResult> {
	const { credential, documentLoader, now, skipStatusCheck } = args;
	const result = await vc.verifyCredential({
		credential: credential as never,
		suite: verifySuites(),
		documentLoader,
		// `vc.verifyCredential` REFUSES to verify a credential carrying
		// `credentialStatus` unless it is given a way to check that status — it
		// errors rather than reporting "verified" on a credential whose
		// revocation state it never examined. That refusal is correct, and
		// without this argument it made the holder unable to verify ANY
		// status-bearing credential: every credential our own harness issues
		// carries a BitstringStatusListEntry, attached pre-signing by the status
		// service, so the error fired on all of them.
		//
		// The failure was also misleading. A tampered credential still failed
		// first on its signature, so tamper fixtures looked fine; only a
		// correctly-signed credential — an expired one, say — got far enough to
		// hit the status wall, and then reported a missing-function error in
		// place of the expiry verdict.
		// `checkStatus` must be handed the verify suites explicitly: it verifies
		// the status-list credential's own proof, and `vc.verifyCredential` does
		// not forward its `suite` down to it. Called bare it throws
		// `TypeError: "suite" must be an object or an array of objects.`, which
		// surfaces as a bare "not verified" with no errors — so wrap it.
		...(skipStatusCheck
			? {}
			: {
					checkStatus: (opts: Record<string, unknown>) =>
						checkStatus({
							...opts,
							suite: verifySuites(),
							documentLoader: statusListLoader(documentLoader),
							// Our harness signs status lists with a key that is
							// deliberately NOT the credential issuer's, so issuer
							// matching is not a property worth enforcing here.
							verifyMatchingIssuers: false
						} as never)
				}),
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

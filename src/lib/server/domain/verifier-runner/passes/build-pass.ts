import type { PassKind } from '$lib/interop/verifier-run/index.js';
import { minimalOpenBadgeCredential } from '$lib/server/domain/credential-fixtures/minimal-open-badge-credential.js';
import type {
	WalletCrypto,
	WalletCryptosuite,
	WalletKey
} from '$lib/server/domain/wallet-crypto/index.js';

/**
 * One built pass fixture: the signed credential plus the holder key its
 * `credentialSubject.id` is bound to. The holder key is server-only and
 * in-memory — present-time flows (OID4VP) use it to sign the `vp_token`
 * inside the same request, then drop it; it is never serialized.
 */
export type BuiltPassCredential = {
	credential: unknown;
	holder: WalletKey;
};

/**
 * Build the signed OB3 credential for one verifier acceptance pass. The
 * honesty contract these fixtures uphold (test-proven for both
 * cryptosuites in `build-pass.test.ts`):
 *
 * - `valid`, `schema-problem`, `expired` — the data-integrity proof
 *   VERIFIES over the exact document handed out (defects are introduced
 *   BEFORE signing, or are date-window-only).
 * - `broken-signature` — the proof FAILS verification (the document is
 *   tampered AFTER signing). The holder binding stays intact: only the
 *   proof is tampered, never the subject, so holder-binding checks at
 *   the verifier fail solely for the intended reason.
 *
 * Every kind returns the holder key whose DID is `credentialSubject.id`.
 */
export async function buildPassCredential(
	crypto: WalletCrypto,
	cryptosuite: WalletCryptosuite,
	kind: PassKind
): Promise<BuiltPassCredential> {
	switch (kind) {
		case 'valid':
			return issueBase(crypto, cryptosuite);
		case 'schema-problem':
			return issueBase(crypto, cryptosuite, (credential) => {
				// OB3 schema defect signed as-is: the required `criteria` is removed
				// from an otherwise-complete Achievement before signing, so the proof
				// stays valid over the OB3-invalid document.
				const subject = credential.credentialSubject as Record<string, unknown>;
				const achievement = subject.achievement as Record<string, unknown>;
				delete achievement.criteria;
			});
		case 'expired':
			return issueBase(crypto, cryptosuite, (credential) => {
				// Window entirely in the past; signed as-is, so the proof is valid
				// but any clock-aware verifier must reject the credential.
				credential.validFrom = isoSeconds(daysAgo(365));
				credential.validUntil = isoSeconds(daysAgo(1));
			});
		case 'broken-signature': {
			const { credential, holder } = await issueBase(crypto, cryptosuite);
			return { credential: tamperProofValue(credential), holder };
		}
	}
}

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Issue the minimal schema-valid OB3 credential the passes share (fresh
 * ephemeral did:key issuer + holder — same {@link minimalOpenBadgeCredential}
 * body as the wallet-client seed credential), applying `mutate` to the
 * document BEFORE signing so each pass's defect is signed over.
 */
async function issueBase(
	crypto: WalletCrypto,
	cryptosuite: WalletCryptosuite,
	mutate?: (credential: Record<string, unknown>) => void
): Promise<BuiltPassCredential> {
	const issuer = await crypto.generateKey(cryptosuite);
	const holder = await crypto.generateKey(cryptosuite);
	const credential = minimalOpenBadgeCredential({
		issuerDid: issuer.did,
		holderDid: holder.did
	});
	mutate?.(credential);
	return { credential: await crypto.issueCredential({ issuer, credential }), holder };
}

/** Flip the last `proofValue` character (within the base58btc alphabet). */
function tamperProofValue(signed: unknown): unknown {
	const credential = signed as { proof?: { proofValue?: string } | { proofValue?: string }[] };
	const proof = Array.isArray(credential.proof) ? credential.proof[0] : credential.proof;
	if (!proof?.proofValue) {
		throw new Error('Signed pass credential has no proof.proofValue to tamper with.');
	}
	const value = proof.proofValue;
	const flipped = value.endsWith('2') ? '3' : '2';
	proof.proofValue = value.slice(0, -1) + flipped;
	return signed;
}

function daysAgo(days: number): Date {
	return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/** XML-dateTime-friendly ISO string without milliseconds. */
function isoSeconds(date: Date): string {
	return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

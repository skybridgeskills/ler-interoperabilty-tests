import type { PassKind } from '$lib/interop/verifier-run/index.js';
import type { WalletCrypto, WalletCryptosuite } from '$lib/server/domain/wallet-crypto/index.js';

/**
 * Build the signed OB3 credential for one verifier acceptance pass. The
 * honesty contract these fixtures uphold (test-proven for both
 * cryptosuites in `build-pass.test.ts`):
 *
 * - `valid`, `schema-problem`, `expired` — the data-integrity proof
 *   VERIFIES over the exact document handed out (defects are introduced
 *   BEFORE signing, or are date-window-only).
 * - `broken-signature` — the proof FAILS verification (the document is
 *   tampered AFTER signing).
 */
export async function buildPassCredential(
	crypto: WalletCrypto,
	cryptosuite: WalletCryptosuite,
	kind: PassKind
): Promise<unknown> {
	switch (kind) {
		case 'valid':
			return issueBase(crypto, cryptosuite);
		case 'schema-problem':
			return issueBase(crypto, cryptosuite, (credential) => {
				// OB3 schema defect signed as-is: AchievementSubject type removed
				// before signing, so the proof stays valid over the defective doc.
				delete (credential.credentialSubject as Record<string, unknown>).type;
			});
		case 'expired':
			return issueBase(crypto, cryptosuite, (credential) => {
				// Window entirely in the past; signed as-is, so the proof is valid
				// but any clock-aware verifier must reject the credential.
				credential.validFrom = isoSeconds(daysAgo(365));
				credential.validUntil = isoSeconds(daysAgo(1));
			});
		case 'broken-signature': {
			const signed = await issueBase(crypto, cryptosuite);
			return tamperProofValue(signed);
		}
	}
}

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Issue the minimal OB3 credential the passes share (fresh ephemeral
 * did:key issuer + holder — same shape as the wallet-client seed
 * credential), applying `mutate` to the document BEFORE signing.
 */
async function issueBase(
	crypto: WalletCrypto,
	cryptosuite: WalletCryptosuite,
	mutate?: (credential: Record<string, unknown>) => void
): Promise<unknown> {
	const issuer = await crypto.generateKey(cryptosuite);
	const holder = await crypto.generateKey(cryptosuite);
	const credential: Record<string, unknown> = {
		'@context': [
			'https://www.w3.org/ns/credentials/v2',
			'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json'
		],
		type: ['VerifiableCredential', 'OpenBadgeCredential'],
		issuer: issuer.did,
		credentialSubject: { id: holder.did, type: 'AchievementSubject' }
	};
	mutate?.(credential);
	return crypto.issueCredential({ issuer, credential });
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

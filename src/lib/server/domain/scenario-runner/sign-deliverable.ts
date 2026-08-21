import { tamperClaimValue, tamperProofValue } from '$lib/server/domain/credential-tamper/index.js';
import type { WalletCrypto, WalletCryptosuite } from '$lib/server/domain/wallet-crypto/index.js';

/**
 * Sign an unsigned credential recipe document locally, for a `deliver-direct`
 * scenario step — a file the operator downloads and hands to the system under
 * test.
 *
 * Unlike the `issue` action (which the transaction service mints, signs, and
 * tampers), `deliver-direct` mints **no exchange**: the suite is the issuer. So
 * this signs with a **fresh ephemeral did:key issuer**, the same way the
 * verifier-runner pass fixtures do (`build-pass.ts`) — a `did:key` issuer any
 * verifier can resolve without trusting a registry.
 *
 * Two placeholders the recipe leaves for a service to overwrite are filled here
 * instead, because there is no service in the path:
 *
 * - `issuer.id` (`did:key:placeholder`) → the ephemeral issuer DID.
 * - `credentialSubject.id` (`{{HOLDER_DID}}`) → a fresh ephemeral holder DID.
 *
 * The honesty contract mirrors `build-pass.ts`: without `tamper` the proof
 * VERIFIES over the exact document handed out; `tamper: 'proof'` makes the
 * signature fail; `tamper: 'claim'` mutates a signature-covered value while
 * leaving the proof structurally intact.
 */
export async function signDeliverable(
	crypto: WalletCrypto,
	args: {
		doc: Record<string, unknown>;
		cryptosuite: WalletCryptosuite;
		tamper?: 'proof' | 'claim';
	}
): Promise<unknown> {
	const { doc, cryptosuite, tamper } = args;

	const issuer = await crypto.generateKey(cryptosuite);
	const holder = await crypto.generateKey(cryptosuite);

	bindIssuer(doc, issuer.did);
	bindSubject(doc, holder.did);

	const signed = await crypto.issueCredential({ issuer, credential: doc });

	if (tamper === 'proof') return tamperProofValue(signed);
	if (tamper === 'claim') return tamperClaimValue(signed);
	return signed;
}

/** Replace the recipe's placeholder `issuer.id`; tolerate a string issuer too. */
function bindIssuer(doc: Record<string, unknown>, did: string): void {
	const issuer = doc.issuer;
	if (issuer && typeof issuer === 'object') {
		(issuer as { id?: unknown }).id = did;
	} else {
		doc.issuer = did;
	}
}

/** Replace the recipe's placeholder `credentialSubject.id`. */
function bindSubject(doc: Record<string, unknown>, did: string): void {
	const subject = doc.credentialSubject;
	if (subject && typeof subject === 'object' && !Array.isArray(subject)) {
		(subject as { id?: unknown }).id = did;
		return;
	}
	throw new Error('Recipe document has no `credentialSubject` object to bind a holder DID onto.');
}

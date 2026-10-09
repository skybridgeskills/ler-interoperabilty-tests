/**
 * Post-signing tamper helpers, shared by every path that has to produce a
 * deliberately-defective **signed** credential — the verifier-runner pass
 * fixtures (`build-pass.ts`) and the scenario `deliver-direct` signer
 * (`scenario-runner/sign-deliverable.ts`).
 *
 * Kept in a neutral domain module so neither caller imports the other's domain
 * (a scenario-runner file must not reach into `verifier-runner`, and vice
 * versa), and so there is exactly **one** implementation of each tamper — never
 * a forked copy that could drift from what the honesty tests assert.
 */

/**
 * Flip the last `proofValue` character (staying within the base58btc alphabet),
 * so the credential **fails as a signature** — the length and multibase prefix
 * are preserved, so it still parses; only the cryptographic check fails. The
 * subject binding is untouched, so holder-binding checks fail solely for the
 * intended reason.
 */
export function tamperProofValue(signed: unknown): unknown {
	const credential = signed as { proof?: { proofValue?: string } | { proofValue?: string }[] };
	const proof = Array.isArray(credential.proof) ? credential.proof[0] : credential.proof;
	if (!proof?.proofValue) {
		throw new Error('Signed credential has no proof.proofValue to tamper with.');
	}
	const value = proof.proofValue;
	const flipped = value.endsWith('2') ? '3' : '2';
	proof.proofValue = value.slice(0, -1) + flipped;
	return signed;
}

/**
 * Append to a signature-covered value (the top-level `name`) **without touching
 * the proof**. The document no longer matches its own signature, so a verifier
 * that actually checks the proof fails it — but a consumer that only checks a
 * proof is *present and well-formed* is fooled, which is exactly the difference
 * this tamper measures.
 */
export function tamperClaimValue(signed: unknown): unknown {
	const credential = signed as { name?: unknown };
	if (typeof credential.name !== 'string') {
		throw new Error('Signed credential has no string `name` to tamper with (claim tamper).');
	}
	credential.name = `${credential.name} `;
	return signed;
}

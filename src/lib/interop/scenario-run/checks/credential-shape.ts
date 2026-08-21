/**
 * Shared readers for the credential a `receive-from-issuer` step received.
 *
 * The received credential rides `StepEvidence.artifact`, never the wire
 * summary, which is what makes every `credential-*` check transport-independent
 * — one family serves the paste page, VCALM and OID4VCI alike. These helpers
 * exist so each check can narrow once and then read plainly, and so none of them
 * throws on a partial run: an absent or malformed artifact is a legible fail,
 * not an exception.
 *
 * Ported from `issuer-runner/checks/ob3-direct-delivery-issuer.ts`, which stays
 * standing until M13.
 */

/** The received credential as an object, or `undefined` when nothing usable arrived. */
export function credentialOf(artifact: unknown): Record<string, unknown> | undefined {
	return artifact && typeof artifact === 'object' && !Array.isArray(artifact)
		? (artifact as Record<string, unknown>)
		: undefined;
}

/** `credentialSubject`, tolerating OB 3.0's array form by reading the first entry. */
export function subjectOf(
	credential: Record<string, unknown>
): Record<string, unknown> | undefined {
	const subject = credential.credentialSubject;
	if (!subject) return undefined;
	if (Array.isArray(subject)) {
		const first: unknown = subject[0];
		return first && typeof first === 'object' ? (first as Record<string, unknown>) : undefined;
	}
	return typeof subject === 'object' ? (subject as Record<string, unknown>) : undefined;
}

/** The `proof` object, or `undefined` when there is none. */
export function proofOf(credential: Record<string, unknown>): Record<string, unknown> | undefined {
	const proof = credential.proof;
	return proof && typeof proof === 'object' && !Array.isArray(proof)
		? (proof as Record<string, unknown>)
		: undefined;
}

/** The issuer identifier, tolerating both the string and the `{ id }` object form. */
export function issuerIdOf(credential: Record<string, unknown>): string | undefined {
	const issuer = credential.issuer;
	if (typeof issuer === 'string') return issuer;
	if (issuer && typeof issuer === 'object') {
		const id = (issuer as { id?: unknown }).id;
		if (typeof id === 'string') return id;
	}
	return undefined;
}

/** The detail every credential check gives when the step received nothing to read. */
export const NO_CREDENTIAL = 'This step received no credential from your issuer.';

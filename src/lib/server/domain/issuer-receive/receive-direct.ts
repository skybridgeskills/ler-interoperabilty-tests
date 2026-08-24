import type { DirectIntakeSummary } from '$lib/interop/scenario-run/index.js';

import { ReceiveInputError } from './receive-input-error.js';
import type { ReceiveFromIssuerResult } from './types.js';

/** Verify a received credential. Injected so the leaf needs no network and stays testable. */
export type VerifyReceivedCredential = (
	credential: unknown
) => Promise<{ verified: boolean; errors?: string[] }>;

/**
 * Receive a credential the operator's issuer produced and they pasted here —
 * the `'direct'` intake, and the only one with no wire at all. Parse, verify,
 * return.
 *
 * The intake semantics are the same as every other transport: **a paste the
 * suite cannot even read is a {@link ReceiveInputError}** (a 400 — nothing was
 * measured), while **a credential that fails verification is a result**
 * (`delivered: true`, `flow.verified: false`, the reason in `verifyErrors`).
 * A verifier that throws is the second case, not the first: a credential that
 * breaks the verifier is a real, scoreable finding about the operator's issuer.
 *
 * Everything the payload checks read rides `credential` → `StepEvidence.artifact`,
 * which is what makes those checks transport-independent.
 */
export async function receiveDirect(args: {
	input: string;
	verify: VerifyReceivedCredential;
}): Promise<ReceiveFromIssuerResult> {
	const text = args.input.trim();
	if (text === '') {
		throw new ReceiveInputError('Paste the credential your issuer produced.');
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		throw new ReceiveInputError('That is not JSON. Paste the credential document itself.');
	}
	if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new ReceiveInputError('A credential must be a JSON object.');
	}

	let verified = false;
	let verifyErrors: string[] | undefined;
	try {
		const result = await args.verify(parsed);
		verified = result.verified;
		if (!verified) {
			verifyErrors = result.errors?.length ? result.errors : ['The credential did not verify.'];
		}
	} catch (e) {
		verifyErrors = [e instanceof Error ? e.message : String(e)];
	}

	const flow: DirectIntakeSummary = {
		transport: 'direct',
		verified,
		...(verifyErrors ? { verifyErrors } : {})
	};

	return { flow, credential: parsed, delivered: true };
}

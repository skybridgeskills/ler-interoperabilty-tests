import type { PresentEvidence, VerifierRunPlanEntry } from '$lib/interop/verifier-run/index.js';
import type { WalletActivity } from '$lib/interop/wallet-activity.js';
import {
	HttpDirectPost,
	Oid4vpPresentationDriver,
	type SubmitResponse
} from '$lib/server/domain/wallet-client/drivers/oid4vp-presentation.js';
import {
	Oid4vpAuthorizationRequest,
	parseAuthorizationRequestLink,
	resolveAuthorizationRequest
} from '$lib/server/domain/wallet-client/oid4vp/index.js';
import type { WalletCrypto, WalletCryptosuite } from '$lib/server/domain/wallet-crypto/index.js';

import { buildPassCredential } from '../passes/build-pass.js';
import { PresentInputError } from '../present-error.js';

export { PresentInputError };

/** A submit-transport factory that threads an `onStatus` observer so the HTTP status is captured. */
export type SubmitFactory = (onStatus: (status: number) => void) => SubmitResponse;

/** The per-credential present result: transport evidence for scoring + narrated wallet activity. */
export type PresentOid4Result = {
	evidence: PresentEvidence;
	activity: WalletActivity[];
};

/**
 * Present one plan entry's credential to the operator's verifier, all inside
 * this one server request: resolve the pasted authorization request, generate
 * the fixture for `entry.kind` (server-only holder key, dropped after signing),
 * sign the `vp_token`, and submit via `direct_post`. Returns transport evidence
 * — a failed submission is evidence (`submitted: false`), never an error; only a
 * malformed request throws {@link PresentInputError} (→ 400). Hermetic:
 * `fetchImpl` and `submitFactory` are injected (the provider wires real fetch +
 * {@link HttpDirectPost}).
 */
export async function presentOid4Credential(args: {
	entry: VerifierRunPlanEntry;
	input: string;
	cryptosuite: WalletCryptosuite;
	crypto: WalletCrypto;
	fetchImpl: typeof fetch;
	submitFactory?: SubmitFactory;
}): Promise<PresentOid4Result> {
	const { entry, input, cryptosuite, crypto, fetchImpl } = args;
	const submitFactory: SubmitFactory =
		args.submitFactory ?? ((onStatus) => HttpDirectPost({ fetchImpl, onStatus }));

	const request = await resolveRequest(input, fetchImpl);

	const held = await buildPassCredential(crypto, cryptosuite, entry.kind);

	let transportStatus: number | undefined;
	const submit = submitFactory((status) => {
		transportStatus = status;
	});
	const driver = Oid4vpPresentationDriver({ crypto, submit });
	const result = await driver.runPresentation({
		request,
		cryptosuite,
		heldCredential: held
	});

	const evidence: PresentEvidence = {
		passId: entry.passId,
		submitted: result.submitted,
		...(transportStatus !== undefined ? { transportStatus } : {}),
		...(result.submissionResult !== undefined ? { transportBody: result.submissionResult } : {}),
		...(result.submissionError !== undefined ? { submissionError: result.submissionError } : {}),
		credential: result.credential
	};

	const activity: WalletActivity[] = [
		{
			id: `oid4-present.${entry.passId}.submit`,
			kind: 'interaction',
			label: `Presented ${entry.label} to your verifier`,
			status: result.submitted ? 'ok' : 'fail',
			detail: result.submitted
				? 'The presentation was submitted to the response endpoint.'
				: (result.submissionError ??
					'The presentation could not be submitted to the response endpoint.')
		}
	];

	return { evidence, activity };
}

/** Parse + resolve + validate the pasted request; throw {@link PresentInputError} on any failure. */
async function resolveRequest(
	input: string,
	fetchImpl: typeof fetch
): Promise<Oid4vpAuthorizationRequest> {
	const parsed = parseAuthorizationRequestLink(input);
	if (parsed.kind === 'invalid') {
		throw new PresentInputError(parsed.reason);
	}
	let raw: unknown;
	if (parsed.kind === 'by-reference') {
		try {
			raw = await resolveAuthorizationRequest({ requestUri: parsed.requestUri }, fetchImpl);
		} catch (e) {
			throw new PresentInputError(e instanceof Error ? e.message : String(e));
		}
	} else {
		raw = parsed.request;
	}
	const validated = Oid4vpAuthorizationRequest.schema.safeParse(raw);
	if (!validated.success) {
		throw new PresentInputError(
			'The authorization request does not match the expected OID4VP shape.'
		);
	}
	return validated.data;
}

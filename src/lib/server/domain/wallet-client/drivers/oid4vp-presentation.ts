import type {
	VerifyResult,
	WalletCrypto,
	WalletCryptosuite
} from '$lib/server/domain/wallet-crypto/index.js';

import {
	matchCredential,
	Oid4vpAuthorizationRequest,
	seedHeldCredential,
	type PresentationSubmission
} from '../oid4vp/index.js';

/**
 * Submit the OID4VP `direct_post` response to the verifier. Real transport POSTs to the
 * `response_uri`; tests inject a capture so the constructed request can be asserted without a
 * live verifier (the suite drives the live submission separately — see the M5 plan).
 */
export type SubmitResponse = (
	responseUri: string,
	body: { vp_token: unknown; presentation_submission: PresentationSubmission }
) => Promise<Record<string, unknown>>;

export type PresentationDriverResult = {
	matched: boolean;
	vpToken?: unknown;
	presentationSubmission?: PresentationSubmission;
	credential?: unknown;
	holder?: { did: string; cryptosuite: WalletCryptosuite };
	verify: VerifyResult;
	submitted: boolean;
	submissionResult?: Record<string, unknown>;
	submissionError?: string;
};

export interface PresentationDriver {
	runPresentation(input: {
		request: unknown;
		cryptosuite: WalletCryptosuite;
	}): Promise<PresentationDriverResult>;
}

/**
 * OID4VP holder presentation driver. Parses the authorization request, seeds a held OB3
 * credential, matches it against the `presentation_definition`, signs a Data Integrity
 * `vp_token` (`challenge` = `nonce`, `domain` = `client_id`, embedding the credential with its
 * issuer proof preserved verbatim), builds the `presentation_submission`, and submits via
 * `direct_post`. The VP self-verifies before submission.
 */
export function Oid4vpPresentationDriver(deps: {
	crypto: WalletCrypto;
	submit?: SubmitResponse;
}): PresentationDriver {
	const submit: SubmitResponse = deps.submit ?? httpDirectPost;

	async function runPresentation(input: {
		request: unknown;
		cryptosuite: WalletCryptosuite;
	}): Promise<PresentationDriverResult> {
		// Validate the untrusted request at this boundary (zod throws on a malformed request).
		const request = Oid4vpAuthorizationRequest(input.request as never);
		const { credential, holder } = await seedHeldCredential(deps.crypto, input.cryptosuite);
		const holderRef = { did: holder.did, cryptosuite: input.cryptosuite };

		const match = matchCredential(request, credential);
		if (!match.matches) {
			return {
				matched: false,
				credential,
				holder: holderRef,
				verify: { verified: false, errors: [match.reason] },
				submitted: false
			};
		}

		// Embed the credential as-is (issuer proof preserved); bind the VP to nonce + client_id.
		const vpToken = await deps.crypto.signPresentation({
			holder,
			challenge: request.nonce,
			domain: request.client_id,
			verifiableCredential: credential
		});
		const verify = await deps.crypto.verifyPresentation(vpToken, {
			challenge: request.nonce,
			domain: request.client_id
		});

		const base: PresentationDriverResult = {
			matched: true,
			vpToken,
			presentationSubmission: match.submission,
			credential,
			holder: holderRef,
			verify,
			submitted: false
		};

		try {
			const submissionResult = await submit(request.response_uri, {
				vp_token: vpToken,
				presentation_submission: match.submission
			});
			return { ...base, submitted: true, submissionResult };
		} catch (e) {
			// Construction succeeded; the live verifier submission failed (live-only path).
			return { ...base, submissionError: e instanceof Error ? e.message : String(e) };
		}
	}

	return { runPresentation };
}

/** Live `direct_post` transport (JSON). The verifier counterpart is the dcc-transaction-service. */
const httpDirectPost: SubmitResponse = async (responseUri, body) => {
	const res = await fetch(responseUri, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
		body: JSON.stringify(body)
	});
	if (!res.ok) {
		throw new Error(`OID4VP direct_post responded ${res.status}.`);
	}
	const text = await res.text();
	return text ? (JSON.parse(text) as Record<string, unknown>) : {};
};

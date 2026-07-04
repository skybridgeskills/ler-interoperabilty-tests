import type {
	VerifyResult,
	WalletCrypto,
	WalletCryptosuite
} from '$lib/server/domain/wallet-crypto/index.js';

import {
	matchCredential,
	Oid4vpAuthorizationRequest,
	seedHeldCredential,
	type HeldCredential,
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
		/**
		 * Pre-built held credential + holder key (verifier-runner present flow).
		 * When absent the driver seeds its own valid OB3 credential — the
		 * wallet-role default, unchanged.
		 */
		heldCredential?: HeldCredential;
	}): Promise<PresentationDriverResult>;
}

/**
 * OID4VP holder presentation driver. Parses the authorization request, uses the injected held
 * credential (or seeds a valid OB3 one), matches it against the `presentation_definition`,
 * signs a Data Integrity `vp_token` (`challenge` = `nonce`, `domain` = `client_id`, embedding
 * the credential with its issuer proof preserved verbatim), builds the
 * `presentation_submission`, and submits via `direct_post`. The VP self-verifies before
 * submission (holder proof only — an intentionally broken embedded VC proof never gates
 * submission; the verifier under test must catch it).
 */
export function Oid4vpPresentationDriver(deps: {
	crypto: WalletCrypto;
	submit?: SubmitResponse;
}): PresentationDriver {
	const submit: SubmitResponse = deps.submit ?? HttpDirectPost();

	async function runPresentation(input: {
		request: unknown;
		cryptosuite: WalletCryptosuite;
		heldCredential?: HeldCredential;
	}): Promise<PresentationDriverResult> {
		// Validate the untrusted request at this boundary (zod throws on a malformed request).
		const request = Oid4vpAuthorizationRequest(input.request as never);
		const { credential, holder } =
			input.heldCredential ?? (await seedHeldCredential(deps.crypto, input.cryptosuite));
		const holderRef = { did: holder.did, cryptosuite: holder.cryptosuite };

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

/**
 * Live `direct_post` transport factory (JSON; the verifier counterpart is the
 * dcc-transaction-service). `onStatus` observes the HTTP status of every completed POST —
 * success or not — so callers that need transport evidence (verifier-runner present flow) can
 * capture it without changing the driver's result contract; the wallet-role default passes no
 * hooks and behaves exactly as before.
 */
export function HttpDirectPost(opts?: {
	fetchImpl?: typeof fetch;
	onStatus?: (status: number) => void;
}): SubmitResponse {
	const fetchImpl = opts?.fetchImpl ?? fetch;
	return async (responseUri, body) => {
		const res = await fetchImpl(responseUri, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
			body: JSON.stringify(body)
		});
		opts?.onStatus?.(res.status);
		if (!res.ok) {
			throw new Error(`OID4VP direct_post responded ${res.status}.`);
		}
		const text = await res.text();
		return text ? (JSON.parse(text) as Record<string, unknown>) : {};
	};
}

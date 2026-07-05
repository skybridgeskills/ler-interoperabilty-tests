import type {
	WalletCrypto,
	WalletCryptosuite,
	WalletKey
} from '$lib/server/domain/wallet-crypto/index.js';

import type { ExchangeFlowTransport, FetchInteractionResult } from '../exchange-flow-transport.js';
import { hasDidAuthQuery, matchQueryByExample, parseVpr, type ParsedVpr } from '../vcalm/vpr.js';

/** A held credential + the holder key its `credentialSubject.id` is bound to. */
export type HeldCredential = { credential: unknown; holder: WalletKey };

/**
 * Everything one VCALM verifier-flow present observed: the interaction fetch,
 * the parsed VPR + whether it was received, the QueryByExample/DIDAuth checks,
 * and the submission result. The floor checks and the present evidence are both
 * derived from this — a non-OK submission is captured as evidence, never thrown.
 */
export type VcalmVerifierFlowResult = {
	fetch: FetchInteractionResult;
	vpr: ParsedVpr;
	vprReceived: boolean;
	matched: boolean;
	matchReason?: string;
	didAuth: boolean;
	submitted: boolean;
	submissionStatus?: number;
	submissionBody?: unknown;
	submissionError?: string;
	credential: unknown;
	holder: { did: string; cryptosuite: WalletCryptosuite };
};

/**
 * VCALM verifier-flow driver: engages a **user-supplied** exchange as holder —
 * fetch the interaction URL → discover `vcapi` → POST `{}` → read the
 * `verifiablePresentationRequest` → sign a VP embedding the (pre-built) pass
 * credential, bound to the VPR challenge/domain, satisfying both the
 * QueryByExample and DIDAuthentication queries → submit to `vcapi`. Each VC-API
 * exchange is single-use, so the caller passes a fresh interaction URL per
 * credential. Hermetic: `transport` is injected (real HTTP or a fake).
 */
export function VcalmVerifierFlowDriver(deps: {
	crypto: WalletCrypto;
	transport: ExchangeFlowTransport;
}) {
	async function runPresentation(input: {
		interactionUrl: string;
		cryptosuite: WalletCryptosuite;
		heldCredential: HeldCredential;
	}): Promise<VcalmVerifierFlowResult> {
		const { credential, holder } = input.heldCredential;
		const holderRef = { did: holder.did, cryptosuite: holder.cryptosuite };

		const fetchRes = await deps.transport.fetchInteractionUrl(input.interactionUrl);
		if (!fetchRes.ok || !fetchRes.vcapiUrl) {
			return {
				fetch: fetchRes,
				vpr: { queries: [] },
				vprReceived: false,
				matched: false,
				didAuth: false,
				submitted: false,
				credential,
				holder: holderRef
			};
		}

		// Engage the exchange: POST {} and read the presentation request.
		const engage = await deps.transport.postToVcapi(fetchRes.vcapiUrl, {});
		const engageBody = engage.rawBody as Record<string, unknown> | undefined;
		const rawVpr = engageBody?.verifiablePresentationRequest;
		const vprReceived = engage.ok && rawVpr !== undefined;
		const vpr = parseVpr(rawVpr);
		const match = matchQueryByExample(vpr.queries, credential);

		// Sign a VP embedding the credential (satisfies QueryByExample + DIDAuth),
		// bound to the VPR challenge/domain, and submit it to the exchange.
		const presentation = await deps.crypto.signPresentation({
			holder,
			challenge: vpr.challenge,
			domain: vpr.domain,
			verifiableCredential: credential
		});
		const submit = await deps.transport.postToVcapi(fetchRes.vcapiUrl, {
			verifiablePresentation: presentation
		});

		return {
			fetch: fetchRes,
			vpr,
			vprReceived,
			matched: match.matches,
			matchReason: match.matches ? undefined : match.reason,
			didAuth: hasDidAuthQuery(vpr.queries),
			submitted: submit.ok,
			submissionStatus: submit.status,
			submissionBody: submit.rawBody,
			submissionError: submit.ok
				? undefined
				: (submit.error ?? `Exchange responded ${submit.status}.`),
			credential,
			holder: holderRef
		};
	}

	return { runPresentation };
}
export type VcalmVerifierFlowDriver = ReturnType<typeof VcalmVerifierFlowDriver>;

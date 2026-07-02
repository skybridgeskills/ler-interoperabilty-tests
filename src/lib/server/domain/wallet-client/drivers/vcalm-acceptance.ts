import type { WalletCrypto, WalletCryptosuite } from '$lib/server/domain/wallet-crypto/index.js';
import type { WalletExchangeView } from '$lib/server/domain/wallet-runner/index.js';

import type {
	AcceptanceDriverInput,
	AcceptanceResult,
	ProtocolDriver
} from '../protocol-driver.js';

/**
 * Continue a VC-API exchange by POSTing `body` to the exchange endpoint. The real transport
 * POSTs to the transaction-service; tests inject a fake that models the participate handshake.
 * Returns the raw VC-API response (DIDAuth request on the first POST, the issued credential
 * envelope on the presentation POST).
 */
export type ContinueExchange = (
	exchangeId: string,
	body: unknown
) => Promise<Record<string, unknown>>;

/**
 * VCALM holder driver. Completes a VC-API exchange as the wallet: POST `{}` to start, answer
 * the DIDAuthentication request with a challenge-bound signed VP, submit it, then receive and
 * verify the issued credential.
 */
export function VcalmAcceptanceDriver(deps: {
	crypto: WalletCrypto;
	continueExchange: ContinueExchange;
}): ProtocolDriver {
	async function runAcceptance(input: AcceptanceDriverInput): Promise<AcceptanceResult> {
		const { exchange, cryptosuite } = input;

		// 1. Start the exchange — the service replies with the DIDAuthentication request.
		const start = await deps.continueExchange(exchange.exchangeId, {});
		const vpr = start.verifiablePresentationRequest as
			| { challenge?: string; domain?: string }
			| undefined;
		if (!vpr?.challenge) {
			throw new Error('VCALM exchange did not return a DIDAuthentication challenge.');
		}

		// 2. Build + sign a holder DIDAuth VP bound to the challenge/domain.
		const holder = await deps.crypto.generateKey(cryptosuite);
		const presentation = await deps.crypto.signPresentation({
			holder,
			challenge: vpr.challenge,
			domain: vpr.domain
		});

		// 3. Submit the VP; the service issues the credential.
		const submitted = await deps.continueExchange(exchange.exchangeId, {
			verifiablePresentation: presentation
		});

		// 4. Extract + verify the issued credential.
		const credential = extractCredential(submitted);
		const verify = credential
			? await deps.crypto.verifyCredential(credential)
			: { verified: false, errors: ['No credential was issued by the exchange.'] };

		const exchangeView: WalletExchangeView = {
			state: credential && verify.verified ? 'complete' : 'invalid',
			variables: { holderDid: holder.did }
		};

		return {
			exchange: exchangeView,
			credential,
			verify,
			presentation,
			holder: { did: holder.did, cryptosuite: cryptosuite as WalletCryptosuite }
		};
	}

	return { runAcceptance };
}

/** Pull the issued VC out of a VC-API presentation response (issuer returns a VP or a VC). */
function extractCredential(response: Record<string, unknown>): unknown {
	const vp = response.verifiablePresentation as { verifiableCredential?: unknown } | undefined;
	const fromVp = vp?.verifiableCredential;
	if (Array.isArray(fromVp)) return fromVp[0];
	if (fromVp) return fromVp;
	if (response.verifiableCredential) return response.verifiableCredential;
	return undefined;
}

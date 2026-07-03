import type { WalletCrypto, WalletCryptosuite } from '$lib/server/domain/wallet-crypto/index.js';
import type { WalletExchangeView } from '$lib/server/domain/wallet-runner/index.js';

import {
	PRE_AUTH_GRANT,
	extractCredential,
	fetchOffer,
	getJson,
	postForm,
	preAuthorizedCodeOf,
	wellKnownMetadataUrl
} from '../oid4vci/index.js';
import type {
	AcceptanceDriverInput,
	AcceptanceResult,
	ProtocolDriver
} from '../protocol-driver.js';

type FetchLike = typeof fetch;

/**
 * OID4VCI 1.0 pre-authorized-code holder driver. Parses the credential offer, discovers issuer
 * + AS metadata, redeems the pre-authorized code for an access token, obtains a `c_nonce`, and
 * requests the credential with a **`di_vp` key proof** — a holder Verifiable Presentation
 * secured with a Data Integrity proof, `proofPurpose: authentication`, `domain` = the credential
 * issuer, `challenge` = the `c_nonce`. The issued credential is then verified.
 *
 * A JWT key proof is intentionally never produced: the OID4 profile requires `di_vp`.
 */
export function Oid4vciAcceptanceDriver(deps: {
	crypto: WalletCrypto;
	fetchImpl?: FetchLike;
}): ProtocolDriver {
	const doFetch: FetchLike = deps.fetchImpl ?? fetch;

	async function runAcceptance(input: AcceptanceDriverInput): Promise<AcceptanceResult> {
		const { exchange, cryptosuite } = input;

		// 1. Credential offer → credential_issuer + pre-authorized_code.
		const offerLink = exchange.protocols.OID4VCI;
		if (typeof offerLink !== 'string') {
			throw new Error('The exchange did not return an OID4VCI credential offer.');
		}
		const offer = await fetchOffer(doFetch, offerLink);
		const issuer = String(offer.credential_issuer);
		const preAuthCode = preAuthorizedCodeOf(offer);
		if (!preAuthCode) throw new Error('Credential offer has no pre-authorized_code.');
		const configurationId = offer.credential_configuration_ids?.[0];

		// 2. Issuer + authorization-server metadata.
		const issuerMeta = await getJson(
			doFetch,
			wellKnownMetadataUrl(issuer, 'openid-credential-issuer')
		);
		const credentialEndpoint = String(issuerMeta.credential_endpoint);
		const nonceEndpoint = issuerMeta.nonce_endpoint as string | undefined;
		const asMeta = await getJson(
			doFetch,
			wellKnownMetadataUrl(issuer, 'oauth-authorization-server')
		).catch(() => ({}) as Record<string, unknown>);
		const tokenEndpoint = (asMeta.token_endpoint as string | undefined) ?? `${issuer}/token`;

		// 3. Redeem the pre-authorized code for an access token (+ maybe a c_nonce).
		const token = await postForm(doFetch, tokenEndpoint, {
			grant_type: PRE_AUTH_GRANT,
			'pre-authorized_code': String(preAuthCode)
		});
		const accessToken = String(token.access_token);
		let cNonce = token.c_nonce as string | undefined;

		// 4. Fetch a c_nonce from the nonce endpoint if the token response didn't carry one.
		if (!cNonce && nonceEndpoint) {
			const nonce = await getJson(doFetch, nonceEndpoint, { method: 'POST', accessToken });
			cNonce = nonce.c_nonce as string | undefined;
		}
		if (!cNonce) throw new Error('No c_nonce available for the di_vp key proof.');

		// 5. Build the di_vp key proof: a holder VP bound to the c_nonce + issuer domain.
		const holder = await deps.crypto.generateKey(cryptosuite);
		const keyProofVp = await deps.crypto.signPresentation({
			holder,
			challenge: cNonce,
			domain: issuer
		});

		// 6. Request the credential with a Bearer token + the di_vp proof.
		const credentialResponse = await getJson(doFetch, credentialEndpoint, {
			method: 'POST',
			accessToken,
			json: {
				...(configurationId ? { credential_configuration_id: configurationId } : {}),
				proofs: { di_vp: [keyProofVp] }
			}
		});

		// 7. Verify the issued credential.
		const credential = extractCredential(credentialResponse);
		const verify = credential
			? await deps.crypto.verifyCredential(credential)
			: { verified: false, errors: ['No credential was issued.'] };

		const exchangeView: WalletExchangeView = {
			state: credential && verify.verified ? 'complete' : 'invalid',
			variables: { oid4vci: { nonceUsed: true }, holderDid: holder.did }
		};

		return {
			exchange: exchangeView,
			credential,
			verify,
			presentation: keyProofVp,
			holder: { did: holder.did, cryptosuite: cryptosuite as WalletCryptosuite }
		};
	}

	return { runAcceptance };
}

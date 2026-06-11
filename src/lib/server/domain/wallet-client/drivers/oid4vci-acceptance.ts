import type { WalletCrypto, WalletCryptosuite } from '$lib/server/domain/wallet-crypto/index.js';
import type { WalletExchangeView } from '$lib/server/domain/wallet-runner/index.js';

import type {
	AcceptanceDriverInput,
	AcceptanceResult,
	ProtocolDriver
} from '../protocol-driver.js';

type FetchLike = typeof fetch;

const PRE_AUTH_GRANT = 'urn:ietf:params:oauth:grant-type:pre-authorized_code';

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
		const preAuthCode = offer.grants?.[PRE_AUTH_GRANT]?.['pre-authorized_code'];
		if (!preAuthCode) throw new Error('Credential offer has no pre-authorized_code.');
		const configurationId = offer.credential_configuration_ids?.[0];

		// 2. Issuer + authorization-server metadata.
		const issuerMeta = await getJson(doFetch, `${issuer}/.well-known/openid-credential-issuer`);
		const credentialEndpoint = String(issuerMeta.credential_endpoint);
		const nonceEndpoint = issuerMeta.nonce_endpoint as string | undefined;
		const asMeta = await getJson(doFetch, `${issuer}/.well-known/oauth-authorization-server`).catch(
			() => ({}) as Record<string, unknown>
		);
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

// ── helpers ──────────────────────────────────────────────────────────────────

type CredentialOffer = {
	credential_issuer: string;
	credential_configuration_ids?: string[];
	grants?: Record<string, { 'pre-authorized_code'?: string }>;
};

/** Resolve `openid-credential-offer://?credential_offer_uri=…` to the offer object. */
async function fetchOffer(doFetch: FetchLike, link: string): Promise<CredentialOffer> {
	const marker = 'credential_offer_uri=';
	const idx = link.indexOf(marker);
	if (idx === -1) throw new Error('OID4VCI offer link has no credential_offer_uri.');
	const offerUri = decodeURIComponent(link.slice(idx + marker.length));
	return getJson(doFetch, offerUri) as Promise<CredentialOffer>;
}

async function getJson(
	doFetch: FetchLike,
	url: string,
	opts: { method?: string; accessToken?: string; json?: unknown } = {}
): Promise<Record<string, unknown>> {
	const headers: Record<string, string> = { Accept: 'application/json' };
	if (opts.accessToken) headers.Authorization = `Bearer ${opts.accessToken}`;
	if (opts.json !== undefined) headers['Content-Type'] = 'application/json';
	const res = await doFetch(url, {
		method: opts.method ?? (opts.json !== undefined ? 'POST' : 'GET'),
		headers,
		body: opts.json !== undefined ? JSON.stringify(opts.json) : undefined
	});
	if (!res.ok) throw new Error(`OID4VCI request to ${url} responded ${res.status}.`);
	return (await res.json()) as Record<string, unknown>;
}

async function postForm(
	doFetch: FetchLike,
	url: string,
	form: Record<string, string>
): Promise<Record<string, unknown>> {
	const res = await doFetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
		body: new URLSearchParams(form)
	});
	if (!res.ok) throw new Error(`OID4VCI token request responded ${res.status}.`);
	return (await res.json()) as Record<string, unknown>;
}

/** Pull the issued VC from an OID4VCI credential response (single or `credentials[]` form). */
function extractCredential(response: Record<string, unknown>): unknown {
	if (response.credential) return response.credential;
	const credentials = response.credentials as Array<{ credential?: unknown }> | undefined;
	if (Array.isArray(credentials) && credentials.length) {
		return credentials[0]?.credential ?? credentials[0];
	}
	return undefined;
}

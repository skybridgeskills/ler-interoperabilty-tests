import { describe, expect, it } from 'vitest';

import { WalletCrypto, type WalletCryptosuite } from '$lib/server/domain/wallet-crypto/index.js';

import { wellKnownMetadataUrl } from '../oid4vci/index.js';

import { Oid4IssuerFlowDriver } from './oid4-issuer-flow.js';

// Path-scoped (per-exchange) issuer identifier: the well-known segment is INSERTED after the host
// and the issuer path is preserved as a suffix (RFC 8615 / OID4VCI §12.2.2).
const ISSUER = 'http://issuer.test/workflows/claim/exchanges/ex-1';
const ISSUER_META_URL = wellKnownMetadataUrl(ISSUER, 'openid-credential-issuer');
const AS_META_URL = wellKnownMetadataUrl(ISSUER, 'oauth-authorization-server');
const OFFER_URI = 'http://issuer.test/offer/ex-1';
const TOKEN_ENDPOINT = `${ISSUER}/token`;
const NONCE_ENDPOINT = `${ISSUER}/nonce`;
const CREDENTIAL_ENDPOINT = `${ISSUER}/credential`;
const ACCESS_TOKEN = 'super-secret-access-token';
const C_NONCE = 'c-nonce-xyz';

const OFFER = {
	credential_issuer: ISSUER,
	credential_configuration_ids: ['OpenBadgeCredential'],
	grants: {
		'urn:ietf:params:oauth:grant-type:pre-authorized_code': {
			'pre-authorized_code': 'pre-auth-123'
		}
	}
};

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

type IssuerOpts = {
	/** Where the offer is delivered: `uri` (credential_offer_uri) or `inline` (credential_offer). */
	offerVia?: 'uri' | 'inline';
	/** Simulate failures at each stage. */
	fail?: 'offer' | 'token' | 'nonce' | 'credential';
	/** Whether the token response carries a c_nonce (else the nonce endpoint provides it). */
	cNonceInToken?: boolean;
};

/**
 * A conformant fake path-scoped OID4VCI issuer that verifies the wallet's di_vp key proof
 * (challenge = c_nonce, domain = issuer) before issuing a *real signed* credential, so the driver's
 * proof construction + verification are exercised end-to-end.
 */
function fakeIssuer(
	crypto: WalletCrypto,
	cryptosuite: WalletCryptosuite,
	opts: IssuerOpts = {}
): typeof fetch {
	const cNonceInToken = opts.cNonceInToken ?? false;
	let issuerKey: Awaited<ReturnType<WalletCrypto['generateKey']>> | undefined;
	return (async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
		const url = typeof input === 'string' ? input : input.toString();
		const body = init?.body;

		if (url === OFFER_URI) {
			if (opts.fail === 'offer') return jsonResponse({ error: 'not_found' }, 404);
			return jsonResponse(OFFER);
		}
		if (url === ISSUER_META_URL) {
			return jsonResponse({
				credential_issuer: ISSUER,
				credential_endpoint: CREDENTIAL_ENDPOINT,
				nonce_endpoint: NONCE_ENDPOINT,
				credential_configurations_supported: {
					OpenBadgeCredential: {
						proof_types_supported: {
							di_vp: { proof_signing_alg_values_supported: ['eddsa-rdfc-2022', 'ecdsa-rdfc-2019'] }
						}
					}
				}
			});
		}
		if (url === AS_META_URL) {
			return jsonResponse({
				token_endpoint: TOKEN_ENDPOINT,
				grant_types_supported: ['urn:ietf:params:oauth:grant-type:pre-authorized_code']
			});
		}
		if (url === TOKEN_ENDPOINT) {
			if (opts.fail === 'token') return jsonResponse({ error: 'invalid_grant' }, 400);
			return jsonResponse({
				access_token: ACCESS_TOKEN,
				token_type: 'bearer',
				...(cNonceInToken ? { c_nonce: C_NONCE } : {})
			});
		}
		if (url === NONCE_ENDPOINT) {
			if (opts.fail === 'nonce') return jsonResponse({ error: 'server_error' }, 500);
			return jsonResponse({ c_nonce: C_NONCE });
		}
		if (url === CREDENTIAL_ENDPOINT) {
			if (opts.fail === 'credential') return jsonResponse({ error: 'invalid_request' }, 400);
			// The issuer MUST see the Bearer token it minted.
			const auth = new Headers(init?.headers).get('Authorization');
			if (auth !== `Bearer ${ACCESS_TOKEN}`) return jsonResponse({ error: 'invalid_token' }, 401);
			const reqBody = JSON.parse(String(body)) as { proofs?: { di_vp?: unknown[] } };
			const vp = reqBody.proofs?.di_vp?.[0];
			const proofCheck = await crypto.verifyPresentation(vp, {
				challenge: C_NONCE,
				domain: ISSUER
			});
			if (!proofCheck.verified) return jsonResponse({ error: 'invalid_proof' }, 400);

			issuerKey ??= await crypto.generateKey(cryptosuite);
			const holderDid = (vp as { holder?: string }).holder;
			const credential = await crypto.issueCredential({
				issuer: issuerKey,
				credential: {
					'@context': [
						'https://www.w3.org/ns/credentials/v2',
						'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json'
					],
					type: ['VerifiableCredential', 'OpenBadgeCredential'],
					issuer: issuerKey.did,
					credentialSubject: { id: holderDid, type: 'AchievementSubject' }
				}
			});
			return jsonResponse({ credential });
		}
		return jsonResponse({ error: 'not_found' }, 404);
	}) as typeof fetch;
}

function offerLinkUri(): string {
	return `openid-credential-offer://?credential_offer_uri=${encodeURIComponent(OFFER_URI)}`;
}
function offerLinkInline(): string {
	return `openid-credential-offer://?credential_offer=${encodeURIComponent(JSON.stringify(OFFER))}`;
}

/** Recursively assert a value's JSON never contains the access token. */
function assertNoAccessToken(value: unknown): void {
	expect(JSON.stringify(value) ?? '').not.toContain(ACCESS_TOKEN);
}

describe('wellKnownMetadataUrl', () => {
	it('inserts the well-known segment before a path-scoped issuer path', () => {
		expect(
			wellKnownMetadataUrl('http://h/workflows/claim/exchanges/id', 'openid-credential-issuer')
		).toBe('http://h/.well-known/openid-credential-issuer/workflows/claim/exchanges/id');
	});

	it('matches the append form for a bare-host issuer (no path)', () => {
		expect(wellKnownMetadataUrl('https://issuer.test', 'openid-credential-issuer')).toBe(
			'https://issuer.test/.well-known/openid-credential-issuer'
		);
	});

	it('strips a trailing slash before appending the path suffix', () => {
		expect(wellKnownMetadataUrl('https://h/tenant/', 'oauth-authorization-server')).toBe(
			'https://h/.well-known/oauth-authorization-server/tenant'
		);
	});
});

describe('Oid4IssuerFlowDriver', () => {
	it('runs the pre-auth flow to completion, populates observations, and is not blocked', async () => {
		const crypto = WalletCrypto();
		const driver = Oid4IssuerFlowDriver({
			crypto,
			fetchImpl: fakeIssuer(crypto, 'eddsa-rdfc-2022')
		});

		const result = await driver.runIssuerFlow(offerLinkUri());
		const obs = result.observations;

		expect(result.blocked).toBe(false);
		expect(result.stoppedAtStep).toBeUndefined();

		// Offer + metadata (step 1).
		expect(obs.offer?.credentialIssuer).toBe(ISSUER);
		expect(obs.offer?.preAuthCode).toBe('pre-auth-123');
		expect(obs.offer?.configurationId).toBe('OpenBadgeCredential');
		expect(obs.issuerMeta?.credentialEndpoint).toBe(CREDENTIAL_ENDPOINT);
		expect(obs.issuerMeta?.diVpSigningAlgs).toContain('eddsa-rdfc-2022');
		expect(obs.asMeta?.tokenEndpoint).toBe(TOKEN_ENDPOINT);

		// Token + nonce (step 2).
		expect(obs.token?.redeemed).toBe(true);
		expect(obs.nonce?.cNonce).toBe(C_NONCE);

		// Credential + verify (step 3).
		expect(obs.holder?.did).toMatch(/^did:key:/);
		expect(obs.delivery?.credential).toBeDefined();
		expect(obs.verify?.verified).toBe(true);

		// Ordered transcript covering every HTTP call.
		expect(obs.transcript.map((t) => t.name)).toEqual([
			'offer',
			'issuer-metadata',
			'as-metadata',
			'token',
			'nonce',
			'credential'
		]);
		// The metadata was fetched at the path-INSERTION location.
		const metaCall = obs.transcript.find((t) => t.name === 'issuer-metadata');
		expect(metaCall?.url).toBe(ISSUER_META_URL);
	});

	it('resolves an inline credential_offer= link', async () => {
		const crypto = WalletCrypto();
		const driver = Oid4IssuerFlowDriver({
			crypto,
			fetchImpl: fakeIssuer(crypto, 'eddsa-rdfc-2022')
		});
		const result = await driver.runIssuerFlow(offerLinkInline());
		expect(result.blocked).toBe(false);
		expect(result.observations.offer?.credentialIssuer).toBe(ISSUER);
		// No offer HTTP call for an inline offer.
		expect(result.observations.transcript.some((t) => t.name === 'offer')).toBe(false);
	});

	it('uses a c_nonce carried directly in the token response (no nonce call)', async () => {
		const crypto = WalletCrypto();
		const driver = Oid4IssuerFlowDriver({
			crypto,
			fetchImpl: fakeIssuer(crypto, 'eddsa-rdfc-2022', { cNonceInToken: true })
		});
		const result = await driver.runIssuerFlow(offerLinkUri());
		expect(result.blocked).toBe(false);
		expect(result.observations.token?.cNonce).toBe(C_NONCE);
		expect(result.observations.transcript.some((t) => t.name === 'nonce')).toBe(false);
	});

	it('blocks at step 1 when the offer cannot be fetched', async () => {
		const crypto = WalletCrypto();
		const driver = Oid4IssuerFlowDriver({
			crypto,
			fetchImpl: fakeIssuer(crypto, 'eddsa-rdfc-2022', { fail: 'offer' })
		});
		const result = await driver.runIssuerFlow(offerLinkUri());
		expect(result.blocked).toBe(true);
		expect(result.stoppedAtStep).toBe(1);
	});

	it('blocks at step 1 when the offer carries no pre-authorized_code', async () => {
		const crypto = WalletCrypto();
		const noPreAuth = `openid-credential-offer://?credential_offer=${encodeURIComponent(
			JSON.stringify({ credential_issuer: ISSUER })
		)}`;
		const driver = Oid4IssuerFlowDriver({
			crypto,
			fetchImpl: fakeIssuer(crypto, 'eddsa-rdfc-2022')
		});
		const result = await driver.runIssuerFlow(noPreAuth);
		expect(result.blocked).toBe(true);
		expect(result.stoppedAtStep).toBe(1);
	});

	it('blocks at step 1 when the offer link is unparseable', async () => {
		const crypto = WalletCrypto();
		const driver = Oid4IssuerFlowDriver({
			crypto,
			fetchImpl: fakeIssuer(crypto, 'eddsa-rdfc-2022')
		});
		const result = await driver.runIssuerFlow('not a valid offer link');
		expect(result.blocked).toBe(true);
		expect(result.stoppedAtStep).toBe(1);
	});

	it('blocks at step 2 when the token request fails', async () => {
		const crypto = WalletCrypto();
		const driver = Oid4IssuerFlowDriver({
			crypto,
			fetchImpl: fakeIssuer(crypto, 'eddsa-rdfc-2022', { fail: 'token' })
		});
		const result = await driver.runIssuerFlow(offerLinkUri());
		expect(result.blocked).toBe(true);
		expect(result.stoppedAtStep).toBe(2);
		expect(result.observations.token?.redeemed).toBe(false);
	});

	it('blocks at step 2 when no c_nonce is obtainable', async () => {
		const crypto = WalletCrypto();
		const driver = Oid4IssuerFlowDriver({
			crypto,
			fetchImpl: fakeIssuer(crypto, 'eddsa-rdfc-2022', { fail: 'nonce' })
		});
		const result = await driver.runIssuerFlow(offerLinkUri());
		expect(result.blocked).toBe(true);
		expect(result.stoppedAtStep).toBe(2);
	});

	it('blocks at step 3 when no credential is returned', async () => {
		const crypto = WalletCrypto();
		const driver = Oid4IssuerFlowDriver({
			crypto,
			fetchImpl: fakeIssuer(crypto, 'eddsa-rdfc-2022', { fail: 'credential' })
		});
		const result = await driver.runIssuerFlow(offerLinkUri());
		expect(result.blocked).toBe(true);
		expect(result.stoppedAtStep).toBe(3);
		expect(result.observations.delivery?.credential).toBeUndefined();
	});

	it('never throws and never leaks the access token into observations/transcript', async () => {
		const crypto = WalletCrypto();
		const driver = Oid4IssuerFlowDriver({
			crypto,
			fetchImpl: fakeIssuer(crypto, 'eddsa-rdfc-2022')
		});
		const result = await driver.runIssuerFlow(offerLinkUri());

		// The token endpoint response body is captured in the transcript but redacted.
		const tokenCall = result.observations.transcript.find((t) => t.name === 'token');
		expect(tokenCall?.responseBody).toBeDefined();
		assertNoAccessToken(result.observations);
		assertNoAccessToken(result.observations.transcript);
		assertNoAccessToken(result);
	});
});

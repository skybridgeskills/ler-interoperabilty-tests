import { describe, expect, it } from 'vitest';

import { WalletCrypto, type WalletCryptosuite } from '$lib/server/domain/wallet-crypto/index.js';
import { ExchangeChecker } from '$lib/server/domain/wallet-runner/index.js';

import { RealWalletClient } from '../wallet-client.js';

import { Oid4vciAcceptanceDriver } from './oid4vci-acceptance.js';

const ISSUER = 'https://issuer.test';
const OFFER_URI = `${ISSUER}/offer`;
const OFFER_LINK = `openid-credential-offer://?credential_offer_uri=${encodeURIComponent(OFFER_URI)}`;
const C_NONCE = 'c-nonce-xyz';

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

/**
 * A conformant fake OID4VCI issuer (pre-authorized-code flow) that verifies the wallet's di_vp
 * key proof (challenge = c_nonce, domain = issuer) before issuing a *real signed* credential —
 * so the driver's proof construction + verification are exercised end-to-end.
 */
function fakeIssuer(crypto: WalletCrypto, cryptosuite: WalletCryptosuite): typeof fetch {
	let issuerKey: Awaited<ReturnType<WalletCrypto['generateKey']>> | undefined;
	return (async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
		const url = typeof input === 'string' ? input : input.toString();
		const body = init?.body;

		if (url === OFFER_URI) {
			return jsonResponse({
				credential_issuer: ISSUER,
				credential_configuration_ids: ['OpenBadgeCredential'],
				grants: {
					'urn:ietf:params:oauth:grant-type:pre-authorized_code': {
						'pre-authorized_code': 'pre-auth-123'
					}
				}
			});
		}
		if (url === `${ISSUER}/.well-known/openid-credential-issuer`) {
			return jsonResponse({
				credential_issuer: ISSUER,
				credential_endpoint: `${ISSUER}/credential`,
				nonce_endpoint: `${ISSUER}/nonce`
			});
		}
		if (url === `${ISSUER}/.well-known/oauth-authorization-server`) {
			return jsonResponse({ token_endpoint: `${ISSUER}/token` });
		}
		if (url === `${ISSUER}/token`) {
			return jsonResponse({ access_token: 'tok-abc', token_type: 'bearer' });
		}
		if (url === `${ISSUER}/nonce`) {
			return jsonResponse({ c_nonce: C_NONCE });
		}
		if (url === `${ISSUER}/credential`) {
			const reqBody = JSON.parse(String(body)) as { proofs?: { di_vp?: unknown[] } };
			const vp = reqBody.proofs?.di_vp?.[0];
			// The issuer MUST validate the di_vp proof: bound to the c_nonce + issuer domain.
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

const CRYPTOSUITES: WalletCryptosuite[] = ['eddsa-rdfc-2022', 'ecdsa-rdfc-2019'];

describe('Oid4vciAcceptanceDriver', () => {
	for (const cs of CRYPTOSUITES) {
		it(`completes the OID4VCI pre-auth flow with a di_vp key proof and passes conformance (${cs})`, async () => {
			const crypto = WalletCrypto();
			const client = RealWalletClient({
				drivers: {
					oid4: Oid4vciAcceptanceDriver({ crypto, fetchImpl: fakeIssuer(crypto, cs) })
				},
				checker: ExchangeChecker()
			});

			const result = await client.acceptCredential({
				profile: 'oid4',
				cryptosuite: cs,
				exchange: { exchangeId: 'ex-1', protocols: { OID4VCI: OFFER_LINK } }
			});

			expect(result.exchange.state).toBe('complete');
			expect(result.verify.verified).toBe(true);
			expect(result.report.verified).toBe(true);
			const additive = result.report.groups.find((g) => g.checklist.kind === 'additive');
			expect(additive?.outcomes.find((o) => o.id.endsWith('consumer.verify-vc-all'))?.status).toBe(
				'pass'
			);
		});
	}

	it('throws when the exchange carries no OID4VCI offer', async () => {
		const crypto = WalletCrypto();
		const driver = Oid4vciAcceptanceDriver({
			crypto,
			fetchImpl: fakeIssuer(crypto, 'eddsa-rdfc-2022')
		});
		await expect(
			driver.runAcceptance({
				profile: 'oid4',
				cryptosuite: 'eddsa-rdfc-2022',
				exchange: { exchangeId: 'ex', protocols: {} }
			})
		).rejects.toThrow(/OID4VCI credential offer/);
	});

	it('rejects when the di_vp proof is not bound to the issuer c_nonce', async () => {
		const crypto = WalletCrypto();
		// An issuer that always rejects the proof simulates a wrong-nonce binding.
		const strictIssuer = ((input: string | URL | Request, init?: RequestInit) => {
			const url = typeof input === 'string' ? input : input.toString();
			if (url === `${ISSUER}/credential`)
				return Promise.resolve(jsonResponse({ error: 'invalid_proof' }, 400));
			return fakeIssuer(crypto, 'eddsa-rdfc-2022')(input, init);
		}) as typeof fetch;
		const driver = Oid4vciAcceptanceDriver({ crypto, fetchImpl: strictIssuer });
		await expect(
			driver.runAcceptance({
				profile: 'oid4',
				cryptosuite: 'eddsa-rdfc-2022',
				exchange: { exchangeId: 'ex', protocols: { OID4VCI: OFFER_LINK } }
			})
		).rejects.toThrow(/responded 400/);
	});
});

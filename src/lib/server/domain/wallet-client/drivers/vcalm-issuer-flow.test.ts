import { describe, expect, it } from 'vitest';

import { WalletCrypto, type WalletCryptosuite } from '$lib/server/domain/wallet-crypto/index.js';

import type { ExchangeFlowTransport } from '../exchange-flow-transport.js';

import { VcalmIssuerFlowDriver } from './vcalm-issuer-flow.js';

type FakeOpts = {
	fetchFails?: boolean;
	noVcapi?: boolean;
	noChallenge?: boolean;
	noCredential?: boolean;
};

/**
 * A fake issuer reachable over the user-URL transport: returns interaction protocols on fetch,
 * a DIDAuthentication request on the empty POST, and a *real signed* OB credential on the VP POST
 * (via WalletCrypto), so verify + downstream checks exercise genuine crypto without a network.
 */
function fakeIssuerTransport(
	crypto: WalletCrypto,
	cryptosuite: WalletCryptosuite,
	opts: FakeOpts = {}
): ExchangeFlowTransport {
	let issuer: Awaited<ReturnType<WalletCrypto['generateKey']>> | undefined;
	return {
		async fetchInteractionUrl() {
			if (opts.fetchFails) {
				return { ok: false, status: 502, rawBody: null, error: 'Interaction URL responded 502.' };
			}
			if (opts.noVcapi) {
				return { ok: true, status: 200, protocols: {}, rawBody: { protocols: {} } };
			}
			return {
				ok: true,
				status: 200,
				protocols: { vcapi: 'https://issuer.test/vcapi/ex-1' },
				vcapiUrl: 'https://issuer.test/vcapi/ex-1',
				tls: { ok: true, protocol: 'TLSv1.3', atLeastTls12: true },
				rawBody: { protocols: { vcapi: 'https://issuer.test/vcapi/ex-1' } }
			};
		},
		async postToVcapi(_vcapiUrl, body) {
			const b = (body ?? {}) as Record<string, unknown>;
			if (!b.verifiablePresentation) {
				if (opts.noChallenge) return { ok: true, status: 200, rawBody: {} };
				return {
					ok: true,
					status: 200,
					rawBody: {
						verifiablePresentationRequest: {
							query: { type: 'DIDAuthentication' },
							challenge: 'challenge-ex-1',
							domain: 'https://issuer.test'
						}
					}
				};
			}
			if (opts.noCredential) return { ok: true, status: 200, rawBody: {} };
			issuer ??= await crypto.generateKey(cryptosuite);
			const holderDid = (b.verifiablePresentation as { holder?: string }).holder;
			const vc = await crypto.issueCredential({
				issuer,
				credential: {
					'@context': [
						'https://www.w3.org/ns/credentials/v2',
						'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json'
					],
					type: ['VerifiableCredential', 'OpenBadgeCredential'],
					issuer: issuer.did,
					credentialSubject: { id: holderDid, type: 'AchievementSubject' }
				}
			});
			return {
				ok: true,
				status: 200,
				rawBody: {
					verifiablePresentation: {
						'@context': ['https://www.w3.org/ns/credentials/v2'],
						type: ['VerifiablePresentation'],
						verifiableCredential: [vc]
					}
				}
			};
		}
	};
}

const CRYPTOSUITES: WalletCryptosuite[] = ['eddsa-rdfc-2022', 'ecdsa-rdfc-2019'];
const URL_IN = 'https://issuer.test/interactions/ex-1';

describe('VcalmIssuerFlowDriver.runIssuerFlow', () => {
	for (const cs of CRYPTOSUITES) {
		it(`completes the whole holder flow against a user-supplied URL (${cs})`, async () => {
			const crypto = WalletCrypto();
			const driver = VcalmIssuerFlowDriver({ crypto, transport: fakeIssuerTransport(crypto, cs) });

			const result = await driver.runIssuerFlow(URL_IN, cs);

			expect(result.blocked).toBe(false);
			expect(result.stoppedAtStep).toBeUndefined();
			const { interaction, didAuth, delivery, verify, holder } = result.observations;
			expect(interaction?.ok).toBe(true);
			expect(interaction?.vcapiUrl).toBe('https://issuer.test/vcapi/ex-1');
			expect(didAuth?.challenge).toBe('challenge-ex-1');
			expect(delivery?.credential).toBeDefined();
			expect(holder?.did.startsWith('did:key:')).toBe(true);
			expect(holder?.cryptosuite).toBe(cs);
			expect(verify?.verified).toBe(true);
		});
	}

	it('stops at step 1 when the interaction URL fetch fails', async () => {
		const crypto = WalletCrypto();
		const driver = VcalmIssuerFlowDriver({
			crypto,
			transport: fakeIssuerTransport(crypto, 'eddsa-rdfc-2022', { fetchFails: true })
		});
		const result = await driver.runIssuerFlow(URL_IN);
		expect(result.blocked).toBe(true);
		expect(result.stoppedAtStep).toBe(1);
		expect(result.observations.didAuth).toBeUndefined();
	});

	it('stops at step 1 when no vcapi is advertised', async () => {
		const crypto = WalletCrypto();
		const driver = VcalmIssuerFlowDriver({
			crypto,
			transport: fakeIssuerTransport(crypto, 'eddsa-rdfc-2022', { noVcapi: true })
		});
		const result = await driver.runIssuerFlow(URL_IN);
		expect(result.blocked).toBe(true);
		expect(result.stoppedAtStep).toBe(1);
	});

	it('stops at step 2 when no DIDAuthentication challenge is returned', async () => {
		const crypto = WalletCrypto();
		const driver = VcalmIssuerFlowDriver({
			crypto,
			transport: fakeIssuerTransport(crypto, 'eddsa-rdfc-2022', { noChallenge: true })
		});
		const result = await driver.runIssuerFlow(URL_IN);
		expect(result.blocked).toBe(true);
		expect(result.stoppedAtStep).toBe(2);
		expect(result.observations.delivery).toBeUndefined();
	});

	it('stops at step 3 when the issuer delivers no credential (holder still recorded)', async () => {
		const crypto = WalletCrypto();
		const driver = VcalmIssuerFlowDriver({
			crypto,
			transport: fakeIssuerTransport(crypto, 'eddsa-rdfc-2022', { noCredential: true })
		});
		const result = await driver.runIssuerFlow(URL_IN);
		expect(result.blocked).toBe(true);
		expect(result.stoppedAtStep).toBe(3);
		expect(result.observations.holder?.did.startsWith('did:key:')).toBe(true);
		expect(result.observations.verify).toBeUndefined();
	});
});

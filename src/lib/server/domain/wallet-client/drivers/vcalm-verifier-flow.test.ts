import { describe, expect, it } from 'vitest';

import { buildPassCredential } from '$lib/server/domain/verifier-runner/index.js';
import { WalletCrypto, type WalletCryptosuite } from '$lib/server/domain/wallet-crypto/index.js';

import type { ExchangeFlowTransport } from '../exchange-flow-transport.js';

import { VcalmVerifierFlowDriver } from './vcalm-verifier-flow.js';

type FakeOpts = {
	fetchFails?: boolean;
	noVcapi?: boolean;
	didAuthOnly?: boolean;
	rejectSubmission?: boolean;
	http?: boolean;
};

const OB3_EXAMPLE = {
	'@context': ['https://www.w3.org/ns/credentials/v2'],
	type: ['VerifiableCredential', 'OpenBadgeCredential']
};

/** A fake verifier reachable over the exchange transport: issues a VPR, then accepts/rejects the VP. */
function fakeVerifierTransport(opts: FakeOpts = {}): ExchangeFlowTransport {
	const host = opts.http ? 'http://verifier.test' : 'https://verifier.test';
	const vcapiUrl = `${host}/vcapi/ex-1`;
	return {
		async fetchInteractionUrl() {
			if (opts.fetchFails) {
				return { ok: false, status: 502, rawBody: null, error: 'Interaction URL responded 502.' };
			}
			if (opts.noVcapi) return { ok: true, status: 200, protocols: {}, rawBody: { protocols: {} } };
			return {
				ok: true,
				status: 200,
				protocols: { vcapi: vcapiUrl },
				vcapiUrl,
				tls: opts.http
					? { ok: false, atLeastTls12: false, error: 'not https' }
					: { ok: true, protocol: 'TLSv1.3', atLeastTls12: true },
				rawBody: { protocols: { vcapi: vcapiUrl } }
			};
		},
		async postToVcapi(_vcapiUrl, body) {
			const b = (body ?? {}) as Record<string, unknown>;
			if (!b.verifiablePresentation) {
				const query = opts.didAuthOnly
					? [{ type: 'DIDAuthentication' }]
					: [
							{ type: 'QueryByExample', credentialQuery: [{ example: OB3_EXAMPLE }] },
							{ type: 'DIDAuthentication' }
						];
				return {
					ok: true,
					status: 200,
					rawBody: {
						verifiablePresentationRequest: {
							query,
							challenge: 'challenge-ex-1',
							domain: 'https://verifier.test'
						}
					}
				};
			}
			if (opts.rejectSubmission) {
				return {
					ok: false,
					status: 400,
					rawBody: { error: 'invalid_presentation' },
					error: 'Exchange responded 400.'
				};
			}
			return { ok: true, status: 200, rawBody: { verified: true } };
		}
	};
}

const CRYPTOSUITES: WalletCryptosuite[] = ['eddsa-rdfc-2022', 'ecdsa-rdfc-2019'];
const URL_IN = 'https://verifier.test/interactions/ex-1';

describe('VcalmVerifierFlowDriver.runPresentation', () => {
	for (const cs of CRYPTOSUITES) {
		it(`engages, matches, and submits a valid credential (${cs})`, async () => {
			const crypto = WalletCrypto();
			const held = await buildPassCredential(crypto, cs, 'valid');
			const driver = VcalmVerifierFlowDriver({ crypto, transport: fakeVerifierTransport() });

			const result = await driver.runPresentation({
				interactionUrl: URL_IN,
				cryptosuite: cs,
				heldCredential: held
			});

			expect(result.fetch.ok).toBe(true);
			expect(result.vprReceived).toBe(true);
			expect(result.matched).toBe(true);
			expect(result.didAuth).toBe(true);
			expect(result.submitted).toBe(true);
			expect(result.submissionStatus).toBe(200);
			expect(result.credential).toBe(held.credential);
			expect(result.holder.did).toBe(held.holder.did);
		});
	}

	it('submits a broken-signature credential too (embedded VC proof does not gate submission)', async () => {
		const crypto = WalletCrypto();
		const held = await buildPassCredential(crypto, 'eddsa-rdfc-2022', 'broken-signature');
		const driver = VcalmVerifierFlowDriver({ crypto, transport: fakeVerifierTransport() });
		const result = await driver.runPresentation({
			interactionUrl: URL_IN,
			cryptosuite: 'eddsa-rdfc-2022',
			heldCredential: held
		});
		expect(result.matched).toBe(true);
		expect(result.submitted).toBe(true);
	});

	it('records a rejected submission as evidence, not an error', async () => {
		const crypto = WalletCrypto();
		const held = await buildPassCredential(crypto, 'eddsa-rdfc-2022', 'valid');
		const driver = VcalmVerifierFlowDriver({
			crypto,
			transport: fakeVerifierTransport({ rejectSubmission: true })
		});
		const result = await driver.runPresentation({
			interactionUrl: URL_IN,
			cryptosuite: 'eddsa-rdfc-2022',
			heldCredential: held
		});
		expect(result.submitted).toBe(false);
		expect(result.submissionStatus).toBe(400);
		expect(result.submissionError).toMatch(/400/);
	});

	it('reports a fetch failure without a vcapi URL (no cascade)', async () => {
		const crypto = WalletCrypto();
		const held = await buildPassCredential(crypto, 'eddsa-rdfc-2022', 'valid');
		const driver = VcalmVerifierFlowDriver({
			crypto,
			transport: fakeVerifierTransport({ fetchFails: true })
		});
		const result = await driver.runPresentation({
			interactionUrl: URL_IN,
			cryptosuite: 'eddsa-rdfc-2022',
			heldCredential: held
		});
		expect(result.fetch.ok).toBe(false);
		expect(result.vprReceived).toBe(false);
		expect(result.submitted).toBe(false);
	});

	it('does not match a DID-auth-only VPR (but still detects the DIDAuth query)', async () => {
		const crypto = WalletCrypto();
		const held = await buildPassCredential(crypto, 'eddsa-rdfc-2022', 'valid');
		const driver = VcalmVerifierFlowDriver({
			crypto,
			transport: fakeVerifierTransport({ didAuthOnly: true })
		});
		const result = await driver.runPresentation({
			interactionUrl: URL_IN,
			cryptosuite: 'eddsa-rdfc-2022',
			heldCredential: held
		});
		expect(result.matched).toBe(false);
		expect(result.matchReason).toMatch(/DID authentication/i);
		expect(result.didAuth).toBe(true);
	});
});

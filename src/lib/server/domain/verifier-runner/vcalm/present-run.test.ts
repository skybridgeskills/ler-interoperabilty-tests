import { describe, expect, it } from 'vitest';

import { PassKind, type VerifierRunPlanEntry } from '$lib/interop/verifier-run/index.js';
import type { ExchangeFlowTransport } from '$lib/server/domain/wallet-client/exchange-flow-transport.js';
import type { TlsProbeResult } from '$lib/server/domain/wallet-client/index.js';
import { WalletCrypto } from '$lib/server/domain/wallet-crypto/index.js';

import { PresentInputError, presentVcalmCredential } from './present-run.js';
import { VCALM_FLOOR_ROW_IDS } from './vpr-checks.js';

const tlsOk: TlsProbeResult = { ok: true, protocol: 'TLSv1.3', atLeastTls12: true };
const probe = async (): Promise<TlsProbeResult> => tlsOk;

const OB3_EXAMPLE = { type: ['VerifiableCredential', 'OpenBadgeCredential'] };

/** A fake verifier exchange: advertises vcapi, returns a QueryByExample + DIDAuth VPR, accepts/rejects. */
function fakeTransport(opts: { reject?: boolean } = {}): ExchangeFlowTransport {
	return {
		async fetchInteractionUrl() {
			return {
				ok: true,
				status: 200,
				protocols: { vcapi: 'https://verifier.test/vcapi/ex-1' },
				vcapiUrl: 'https://verifier.test/vcapi/ex-1',
				tls: tlsOk,
				rawBody: {}
			};
		},
		async postToVcapi(_vcapiUrl, body) {
			const b = (body ?? {}) as Record<string, unknown>;
			if (!b.verifiablePresentation) {
				return {
					ok: true,
					status: 200,
					rawBody: {
						verifiablePresentationRequest: {
							query: [
								{ type: 'QueryByExample', credentialQuery: [{ example: OB3_EXAMPLE }] },
								{ type: 'DIDAuthentication' }
							],
							challenge: 'chal-1',
							domain: 'https://verifier.test'
						}
					}
				};
			}
			if (opts.reject) {
				return { ok: false, status: 400, rawBody: {}, error: 'Exchange responded 400.' };
			}
			return { ok: true, status: 200, rawBody: { verified: true } };
		}
	};
}

function entryFor(kind: (typeof PassKind.schema.options)[number]): VerifierRunPlanEntry {
	return { passId: `pass-${kind}`, label: `Credential ${kind}`, kind };
}

const URL_IN = 'https://verifier.test/interactions/ex-1';

describe('presentVcalmCredential', () => {
	for (const kind of PassKind.schema.options) {
		it(`presents and submits the ${kind} credential (evidence + floor)`, async () => {
			const crypto = WalletCrypto();
			const { evidence, floorOutcomes } = await presentVcalmCredential({
				entry: entryFor(kind),
				interactionUrl: URL_IN,
				cryptosuite: 'eddsa-rdfc-2022',
				crypto,
				transport: fakeTransport(),
				probe
			});

			expect(evidence.passId).toBe(`pass-${kind}`);
			expect(evidence.submitted).toBe(true);
			expect(evidence.transportStatus).toBe(200);
			expect(evidence.credential).toBeDefined();
			expect(floorOutcomes.map((o) => o.id).sort()).toEqual(
				Object.values(VCALM_FLOOR_ROW_IDS).sort()
			);
			expect(floorOutcomes.every((o) => o.status === 'pass')).toBe(true);
		});
	}

	it('records a rejected exchange response as evidence, not an error', async () => {
		const crypto = WalletCrypto();
		const { evidence } = await presentVcalmCredential({
			entry: entryFor('valid'),
			interactionUrl: URL_IN,
			cryptosuite: 'eddsa-rdfc-2022',
			crypto,
			transport: fakeTransport({ reject: true }),
			probe
		});
		expect(evidence.submitted).toBe(false);
		expect(evidence.transportStatus).toBe(400);
		expect(evidence.submissionError).toMatch(/400/);
	});

	it('throws PresentInputError on a blank interaction URL', async () => {
		const crypto = WalletCrypto();
		await expect(
			presentVcalmCredential({
				entry: entryFor('valid'),
				interactionUrl: '   ',
				cryptosuite: 'eddsa-rdfc-2022',
				crypto,
				transport: fakeTransport(),
				probe
			})
		).rejects.toBeInstanceOf(PresentInputError);
	});

	it('throws PresentInputError on a non-URL interaction URL', async () => {
		const crypto = WalletCrypto();
		await expect(
			presentVcalmCredential({
				entry: entryFor('valid'),
				interactionUrl: 'not a url',
				cryptosuite: 'eddsa-rdfc-2022',
				crypto,
				transport: fakeTransport(),
				probe
			})
		).rejects.toBeInstanceOf(PresentInputError);
	});
});

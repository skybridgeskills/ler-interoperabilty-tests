import { describe, expect, it } from 'vitest';

import { WalletCrypto, type WalletCryptosuite } from '$lib/server/domain/wallet-crypto/index.js';
import { ExchangeChecker } from '$lib/server/domain/wallet-runner/index.js';

import { RealWalletClient } from '../wallet-client.js';

import { VcalmAcceptanceDriver, type ContinueExchange } from './vcalm-acceptance.js';

/**
 * A fake VCALM backend that models the participate handshake and issues a *real signed*
 * credential via WalletCrypto, so the driver's verify + conformance checks exercise genuine
 * crypto end-to-end without a live transaction service.
 */
function fakeVcalmBackend(crypto: WalletCrypto, cryptosuite: WalletCryptosuite): ContinueExchange {
	let issuer: Awaited<ReturnType<WalletCrypto['generateKey']>> | undefined;
	return async (exchangeId, body) => {
		const b = (body ?? {}) as Record<string, unknown>;
		if (!b.verifiablePresentation) {
			return {
				verifiablePresentationRequest: {
					query: { type: 'DIDAuthentication' },
					challenge: `challenge-${exchangeId}`,
					domain: 'https://issuer.test'
				}
			};
		}
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
			verifiablePresentation: {
				'@context': ['https://www.w3.org/ns/credentials/v2'],
				type: ['VerifiablePresentation'],
				verifiableCredential: [vc]
			}
		};
	};
}

const CRYPTOSUITES: WalletCryptosuite[] = ['eddsa-rdfc-2022', 'ecdsa-rdfc-2019'];

describe('VcalmAcceptanceDriver', () => {
	for (const cs of CRYPTOSUITES) {
		it(`completes the VCALM holder flow and passes conformance (${cs})`, async () => {
			const crypto = WalletCrypto();
			const client = RealWalletClient({
				drivers: {
					vcalm: VcalmAcceptanceDriver({ crypto, continueExchange: fakeVcalmBackend(crypto, cs) })
				},
				checker: ExchangeChecker()
			});

			const result = await client.acceptCredential({
				profile: 'vcalm',
				cryptosuite: cs,
				exchange: { exchangeId: 'ex-1', protocols: {} }
			});

			expect(result.exchange.state).toBe('complete');
			expect(result.verify.verified).toBe(true);
			expect(result.holder?.cryptosuite).toBe(cs);
			expect(result.report.verified).toBe(true);

			const additive = result.report.groups.find((g) => g.checklist.kind === 'additive');
			expect(additive?.outcomes.find((o) => o.id.endsWith('consumer.verify-vc-all'))?.status).toBe(
				'pass'
			);
			expect(
				additive?.outcomes.find((o) => o.id.endsWith('producer.holder-did-method'))?.status
			).toBe('pass');
		});
	}

	it('reports invalid + unverified when the exchange issues no credential', async () => {
		const crypto = WalletCrypto();
		const continueExchange: ContinueExchange = async (_id, body) => {
			const b = (body ?? {}) as Record<string, unknown>;
			if (!b.verifiablePresentation) {
				return { verifiablePresentationRequest: { challenge: 'c', domain: 'd' } };
			}
			return {};
		};
		const client = RealWalletClient({
			drivers: { vcalm: VcalmAcceptanceDriver({ crypto, continueExchange }) }
		});
		const result = await client.acceptCredential({
			profile: 'vcalm',
			exchange: { exchangeId: 'ex', protocols: {} }
		});
		expect(result.exchange.state).toBe('invalid');
		expect(result.report.verified).toBe(false);
	});

	it('throws when the exchange returns no DIDAuthentication challenge', async () => {
		const crypto = WalletCrypto();
		const continueExchange: ContinueExchange = async () => ({});
		const driver = VcalmAcceptanceDriver({ crypto, continueExchange });
		await expect(
			driver.runAcceptance({
				profile: 'vcalm',
				cryptosuite: 'eddsa-rdfc-2022',
				exchange: { exchangeId: 'ex', protocols: {} }
			})
		).rejects.toThrow(/DIDAuthentication challenge/);
	});
});

import { describe, expect, it } from 'vitest';

import { WalletCrypto, type WalletCryptosuite } from '$lib/server/domain/wallet-crypto/index.js';
import { ExchangeChecker } from '$lib/server/domain/wallet-runner/index.js';

import { RealWalletClient } from '../wallet-client.js';

import { Oid4vpPresentationDriver, type SubmitResponse } from './oid4vp-presentation.js';

function obRequest(typeConst = 'OpenBadgeCredential') {
	return {
		client_id: 'https://verifier.test',
		response_uri: 'https://verifier.test/oid4vp/response',
		response_mode: 'direct_post' as const,
		nonce: 'nonce-xyz',
		presentation_definition: {
			id: 'ob3-def',
			input_descriptors: [
				{
					id: 'ob3',
					constraints: {
						fields: [
							{ path: ['$.type'], filter: { type: 'array', contains: { const: typeConst } } }
						]
					}
				}
			]
		}
	};
}

const CRYPTOSUITES: WalletCryptosuite[] = ['eddsa-rdfc-2022', 'ecdsa-rdfc-2019'];

describe('Oid4vpPresentationDriver', () => {
	for (const cs of CRYPTOSUITES) {
		it(`builds + self-verifies a vp_token, submits direct_post, and passes conformance (${cs})`, async () => {
			const crypto = WalletCrypto();
			const captured: {
				uri: string;
				body: { vp_token: unknown; presentation_submission: unknown };
			}[] = [];
			const submit: SubmitResponse = async (uri, body) => {
				captured.push({ uri, body });
				return { received: true };
			};
			const client = RealWalletClient({
				drivers: {},
				presentationDriver: Oid4vpPresentationDriver({ crypto, submit }),
				checker: ExchangeChecker()
			});

			const result = await client.presentCredential({ request: obRequest(), cryptosuite: cs });

			expect(result.matched).toBe(true);
			expect(result.verify.verified).toBe(true); // VP self-verifies (challenge=nonce, domain=client_id)
			expect(result.submitted).toBe(true);
			expect(result.holder?.cryptosuite).toBe(cs);

			// The captured direct_post body is { vp_token, presentation_submission } (ldp_vp).
			expect(captured).toHaveLength(1);
			expect(captured[0].uri).toBe('https://verifier.test/oid4vp/response');
			const submission = captured[0].body.presentation_submission as {
				definition_id: string;
				descriptor_map: { format: string; path: string }[];
			};
			expect(submission.definition_id).toBe('ob3-def');
			expect(submission.descriptor_map[0]).toMatchObject({ format: 'ldp_vp', path: '$' });

			// The embedded credential keeps its issuer proof verbatim.
			const vc = (captured[0].body.vp_token as { verifiableCredential: { proof?: unknown }[] })
				.verifiableCredential[0];
			expect(vc.proof).toBeDefined();

			expect(result.report.verified).toBe(true);
			const additive = result.report.groups.find((g) => g.checklist.kind === 'additive');
			expect(
				additive?.outcomes.find((o) => o.id.endsWith('producer.preserve-vc-proofs'))?.status
			).toBe('pass');
			expect(
				additive?.outcomes.find((o) => o.id.endsWith('producer.vp-cryptosuite-supported'))?.status
			).toBe('pass');
		});
	}

	it('does not match or submit when the request requires a different credential type', async () => {
		const crypto = WalletCrypto();
		let submitted = false;
		const submit: SubmitResponse = async () => {
			submitted = true;
			return {};
		};
		const client = RealWalletClient({
			drivers: {},
			presentationDriver: Oid4vpPresentationDriver({ crypto, submit })
		});

		const result = await client.presentCredential({
			request: obRequest('SomeOtherCredential'),
			cryptosuite: 'eddsa-rdfc-2022'
		});

		expect(result.matched).toBe(false);
		expect(result.submitted).toBe(false);
		expect(result.verify.verified).toBe(false);
		expect(submitted).toBe(false);
	});

	it('records a submission error without throwing when the live verifier rejects', async () => {
		const crypto = WalletCrypto();
		const submit: SubmitResponse = async () => {
			throw new Error('direct_post responded 400');
		};
		const client = RealWalletClient({
			drivers: {},
			presentationDriver: Oid4vpPresentationDriver({ crypto, submit })
		});

		const result = await client.presentCredential({
			request: obRequest(),
			cryptosuite: 'eddsa-rdfc-2022'
		});
		// Construction succeeded (the VP self-verifies); only the live submission failed.
		expect(result.matched).toBe(true);
		expect(result.verify.verified).toBe(true);
		expect(result.submitted).toBe(false);
		expect(result.submissionError).toMatch(/400/);
	});
});

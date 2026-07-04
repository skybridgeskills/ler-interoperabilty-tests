import { describe, expect, it } from 'vitest';

import { WalletCrypto, type WalletCryptosuite } from '$lib/server/domain/wallet-crypto/index.js';
import { ExchangeChecker } from '$lib/server/domain/wallet-runner/index.js';

import { RealWalletClient } from '../wallet-client.js';

import {
	HttpDirectPost,
	Oid4vpPresentationDriver,
	type SubmitResponse
} from './oid4vp-presentation.js';

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

	it('uses an injected held credential instead of seeding (holder + embedded VC match)', async () => {
		const crypto = WalletCrypto();
		const holder = await crypto.generateKey('eddsa-rdfc-2022');
		const issuer = await crypto.generateKey('eddsa-rdfc-2022');
		const credential = await crypto.issueCredential({
			issuer,
			credential: {
				'@context': [
					'https://www.w3.org/ns/credentials/v2',
					'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json'
				],
				type: ['VerifiableCredential', 'OpenBadgeCredential'],
				issuer: issuer.did,
				credentialSubject: { id: holder.did, type: 'AchievementSubject' }
			}
		});
		const captured: { body: { vp_token: unknown } }[] = [];
		const submit: SubmitResponse = async (_uri, body) => {
			captured.push({ body });
			return {};
		};
		const driver = Oid4vpPresentationDriver({ crypto, submit });

		const result = await driver.runPresentation({
			request: obRequest(),
			cryptosuite: 'eddsa-rdfc-2022',
			heldCredential: { credential, holder }
		});

		expect(result.matched).toBe(true);
		expect(result.submitted).toBe(true);
		expect(result.verify.verified).toBe(true);
		// The injected credential and holder are used verbatim — no internal seeding.
		expect(result.credential).toBe(credential);
		expect(result.holder?.did).toBe(holder.did);
		const vp = captured[0].body.vp_token as { verifiableCredential: unknown[] };
		expect(vp.verifiableCredential[0]).toBe(credential);
	});

	it('submits a held credential whose embedded VC proof is broken (regression: no gate on embedded-VC verification)', async () => {
		const crypto = WalletCrypto();
		const holder = await crypto.generateKey('eddsa-rdfc-2022');
		const issuer = await crypto.generateKey('eddsa-rdfc-2022');
		const credential = (await crypto.issueCredential({
			issuer,
			credential: {
				'@context': [
					'https://www.w3.org/ns/credentials/v2',
					'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json'
				],
				type: ['VerifiableCredential', 'OpenBadgeCredential'],
				issuer: issuer.did,
				credentialSubject: { id: holder.did, type: 'AchievementSubject' }
			}
		})) as { proof: { proofValue: string } };
		// Tamper the issuer proof AFTER signing (subject binding stays intact).
		credential.proof.proofValue = `${credential.proof.proofValue.slice(0, -1)}${
			credential.proof.proofValue.endsWith('2') ? '3' : '2'
		}`;
		const brokenVc = await crypto.verifyCredential(credential);
		expect(brokenVc.verified).toBe(false);

		let submitted = false;
		const submit: SubmitResponse = async () => {
			submitted = true;
			return {};
		};
		const driver = Oid4vpPresentationDriver({ crypto, submit });

		const result = await driver.runPresentation({
			request: obRequest(),
			cryptosuite: 'eddsa-rdfc-2022',
			heldCredential: { credential, holder }
		});

		// Submission is never gated on the self-check: the broken embedded VC still ships
		// (the verifier under test must catch it), even though the VP self-check reports it.
		expect(result.matched).toBe(true);
		expect(result.submitted).toBe(true);
		expect(submitted).toBe(true);
	});

	it('HttpDirectPost surfaces the HTTP status via onStatus on success and failure', async () => {
		const statuses: number[] = [];
		const okFetch = (async () =>
			new Response(JSON.stringify({ received: true }), { status: 200 })) as typeof fetch;
		const okSubmit = HttpDirectPost({ fetchImpl: okFetch, onStatus: (s) => statuses.push(s) });
		const okResult = await okSubmit('https://verifier.test/response', {
			vp_token: {},
			presentation_submission: { id: 's', definition_id: 'd', descriptor_map: [] }
		});
		expect(okResult).toEqual({ received: true });
		expect(statuses).toEqual([200]);

		const badFetch = (async () => new Response('nope', { status: 400 })) as typeof fetch;
		const badSubmit = HttpDirectPost({ fetchImpl: badFetch, onStatus: (s) => statuses.push(s) });
		await expect(
			badSubmit('https://verifier.test/response', {
				vp_token: {},
				presentation_submission: { id: 's', definition_id: 'd', descriptor_map: [] }
			})
		).rejects.toThrow(/400/);
		expect(statuses).toEqual([200, 400]);
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

import { describe, expect, it } from 'vitest';

import { buildAppContext } from '$lib/server/build-app-context.js';
import {
	asFakeTransactionServiceClient,
	transactionServiceClient
} from '$lib/server/domain/exchange-runner/provide-transaction-service-client.js';
import { runInContext } from '$lib/server/util/provider/provider-ctx.js';

import { POST } from './+server.js';

type Payload = {
	exchangeId?: string;
	workflowId?: string;
	protocols?: Record<string, unknown>;
	code?: number;
	message?: string;
	hint?: string;
	reason?: { kind: string; requested: string; available: string[] };
};

async function withCtx<T>(fn: () => Promise<T>): Promise<T> {
	const ctx = await buildAppContext({ CONTEXT: 'test' });
	return runInContext(ctx, fn);
}

async function callPost(body?: unknown): Promise<{ status: number; payload: Payload }> {
	const request = new Request('http://localhost/api/exchange-runner/create', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		...(body === undefined ? {} : { body: JSON.stringify(body) })
	});
	const response = await POST({ request } as Parameters<typeof POST>[0]);
	return { status: response.status, payload: (await response.json()) as Payload };
}

/** The credential document the fake stored for a minted exchange. */
function mintedCredential(exchangeId: string): Record<string, unknown> {
	const stored = asFakeTransactionServiceClient(transactionServiceClient()).getStored(exchangeId);
	return JSON.parse(String(stored?.variables?.vc)) as Record<string, unknown>;
}

/**
 * Which tenant token the exchange was minted with.
 *
 * The real service carries the tenant in the Bearer header and never echoes it;
 * the fake records it so a route test can assert the resolved tenant reached the
 * client. See `fake-transaction-service-client.ts`.
 */
function mintedWithTenantToken(exchangeId: string): unknown {
	return asFakeTransactionServiceClient(transactionServiceClient()).getStored(exchangeId)?.variables
		?.mintedWithTenantToken;
}

// `buildAppContext` dynamically imports the whole test context (wallet crypto
// included), which is slow enough to trip the 5s default when the three Vitest
// projects run in parallel. Same allowance as the sibling runner route tests.
describe('POST /api/exchange-runner/create', { timeout: 20_000 }, () => {
	describe('issue', () => {
		it('mints a claim exchange carrying the recipe’s document', async () => {
			await withCtx(async () => {
				const { status, payload } = await callPost({ kind: 'issue', credential: 'minimal-ob3' });

				expect(status).toBe(200);
				expect(payload.workflowId).toBe('claim');
				expect(mintedCredential(payload.exchangeId!)).toMatchObject({
					type: ['VerifiableCredential', 'OpenBadgeCredential'],
					credentialSubject: { id: '{{HOLDER_DID}}' }
				});
			});
		});

		it('mints a fresh credential id per exchange — a reused one 500s the claim', async () => {
			await withCtx(async () => {
				const first = await callPost({ kind: 'issue', credential: 'minimal-ob3' });
				const second = await callPost({ kind: 'issue', credential: 'minimal-ob3' });

				const a = mintedCredential(first.payload.exchangeId!).id;
				const b = mintedCredential(second.payload.exchangeId!).id;
				expect(a).toMatch(/^urn:uuid:/);
				expect(a).not.toBe(b);
			});
		});

		it('sends a different document for a different recipe', async () => {
			await withCtx(async () => {
				const { payload } = await callPost({ kind: 'issue', credential: 'ob3-expired' });

				expect(mintedCredential(payload.exchangeId!)).toMatchObject({
					validUntil: '2024-12-31T00:00:00Z'
				});
			});
		});

		it('passes tamper through as an exchange variable', async () => {
			await withCtx(async () => {
				const { payload } = await callPost({
					kind: 'issue',
					credential: 'minimal-ob3',
					tamper: 'proof'
				});

				const stored = asFakeTransactionServiceClient(transactionServiceClient()).getStored(
					payload.exchangeId!
				);
				expect(stored?.variables?.tamper).toBe('proof');
			});
		});

		it('omits tamper when the action does not ask for it', async () => {
			await withCtx(async () => {
				const { payload } = await callPost({ kind: 'issue', credential: 'minimal-ob3' });

				const stored = asFakeTransactionServiceClient(transactionServiceClient()).getStored(
					payload.exchangeId!
				);
				expect(stored?.variables).not.toHaveProperty('tamper');
			});
		});

		it('passes exchangeIdPrefix through', async () => {
			await withCtx(async () => {
				const { payload } = await callPost({
					kind: 'issue',
					credential: 'minimal-ob3',
					exchangeIdPrefix: 'oid4-wallet-acceptance'
				});

				const stored = asFakeTransactionServiceClient(transactionServiceClient()).getStored(
					payload.exchangeId!
				);
				expect(stored?.variables?.exchangeIdPrefix).toBe('oid4-wallet-acceptance');
			});
		});

		it('400s an unknown recipe id, naming the registered ones', async () => {
			await withCtx(async () => {
				const { status, payload } = await callPost({ kind: 'issue', credential: 'no-such-recipe' });

				expect(status).toBe(400);
				expect(payload.message).toContain('no-such-recipe');
				expect(payload.hint).toContain('minimal-ob3');
			});
		});
	});

	describe('issuing intent', () => {
		it('serves an elective action — no intent means the deployment chooses', async () => {
			await withCtx(async () => {
				const { status } = await callPost({ kind: 'issue', credential: 'minimal-ob3' });
				expect(status).toBe(200);
			});
		});

		it('mints under the tenant the seam resolved, not a token baked into the client', async () => {
			// The wiring the tenant map exists for. `resolveIssuingContext` picks the
			// tenant; the route must actually USE it. If the client kept minting under
			// its construction-time token, a pinned scenario would quietly issue the
			// default cryptosuite under a label claiming otherwise — a recorded lie,
			// and one no test above this line would catch.
			await withCtx(async () => {
				const { payload } = await callPost({ kind: 'issue', credential: 'minimal-ob3' });
				expect(mintedWithTenantToken(payload.exchangeId!)).toBe('fake-token');
			});
		});

		it('serves a pin that matches what the deployment advertises', async () => {
			await withCtx(async () => {
				const { status } = await callPost({
					kind: 'issue',
					credential: 'minimal-ob3',
					intent: { cryptosuite: 'eddsa-rdfc-2022', didMethod: 'key' }
				});
				expect(status).toBe(200);
			});
		});

		it('400s a cryptosuite this deployment cannot serve, with a typed reason', async () => {
			await withCtx(async () => {
				const { status, payload } = await callPost({
					kind: 'issue',
					credential: 'minimal-ob3',
					intent: { cryptosuite: 'bbs-2023', didMethod: 'key' }
				});

				expect(status).toBe(400);
				expect(payload.reason).toEqual({
					kind: 'cryptosuite-unavailable',
					requested: 'bbs-2023',
					available: ['eddsa-rdfc-2022']
				});
			});
		});

		it('400s a DID method this deployment cannot serve', async () => {
			await withCtx(async () => {
				const { status, payload } = await callPost({
					kind: 'issue',
					credential: 'minimal-ob3',
					intent: { cryptosuite: 'eddsa-rdfc-2022', didMethod: 'web' }
				});

				expect(status).toBe(400);
				expect(payload.reason?.kind).toBe('did-method-unavailable');
			});
		});
	});

	describe('request-presentation', () => {
		it('mints a verify exchange from the named request', async () => {
			await withCtx(async () => {
				const { status, payload } = await callPost({
					kind: 'request-presentation',
					request: 'ob3-any'
				});

				expect(status).toBe(200);
				expect(payload.workflowId).toBe('verify');
				const stored = asFakeTransactionServiceClient(transactionServiceClient()).getStored(
					payload.exchangeId!
				);
				expect(stored?.variables?.vprCredentialType).toEqual(['OpenBadgeCredential']);
			});
		});

		it('forwards the three conduct fields under the service’s wire names', async () => {
			await withCtx(async () => {
				const { status, payload } = await callPost({
					kind: 'request-presentation',
					request: 'ob3-any',
					queryLanguage: 'pex',
					limitDisclosure: 'required',
					advertiseCryptosuites: ['ecdsa-sd-2023']
				});

				expect(status).toBe(200);
				const stored = asFakeTransactionServiceClient(transactionServiceClient()).getStored(
					payload.exchangeId!
				);
				expect(stored?.variables).toMatchObject({
					oid4vpQueryLanguage: 'pex',
					vprLimitDisclosure: 'required',
					vprAdvertiseCryptosuites: ['ecdsa-sd-2023']
				});
			});
		});

		it('sends no conduct variable when the action carries none', async () => {
			await withCtx(async () => {
				const { payload } = await callPost({ kind: 'request-presentation', request: 'ob3-any' });

				const stored = asFakeTransactionServiceClient(transactionServiceClient()).getStored(
					payload.exchangeId!
				);
				expect(stored?.variables).not.toHaveProperty('oid4vpQueryLanguage');
				expect(stored?.variables).not.toHaveProperty('vprLimitDisclosure');
				expect(stored?.variables).not.toHaveProperty('vprAdvertiseCryptosuites');
			});
		});

		it('400s an unknown query language rather than dropping it', async () => {
			await withCtx(async () => {
				const { status, payload } = await callPost({
					kind: 'request-presentation',
					request: 'ob3-any',
					queryLanguage: 'sparql'
				});

				expect(status).toBe(400);
				expect(payload.message).toBe('Unrecognised exchange action');
			});
		});

		it('400s an unknown request id', async () => {
			await withCtx(async () => {
				const { status, payload } = await callPost({
					kind: 'request-presentation',
					request: 'no-such-request'
				});

				expect(status).toBe(400);
				expect(payload.hint).toContain('ob3-any');
			});
		});
	});

	describe('bad requests', () => {
		it('400s an empty body — there is no default action any more', async () => {
			await withCtx(async () => {
				expect((await callPost()).status).toBe(400);
			});
		});

		it('400s the retired { intent } body rather than silently minting', async () => {
			await withCtx(async () => {
				const { status, payload } = await callPost({ intent: 'issuance' });
				expect(status).toBe(400);
				expect(payload.message).toBe('Unrecognised exchange action');
			});
		});
	});
});

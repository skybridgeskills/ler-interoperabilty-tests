import { describe, expect, it } from 'vitest';

import type { AppContext } from '$lib/server/app-context.js';
import { buildAppContext } from '$lib/server/build-app-context.js';
import { provideFakeTransactionServiceClient } from '$lib/server/domain/exchange-runner/index.js';
import { transactionServiceClient } from '$lib/server/domain/exchange-runner/provide-transaction-service-client.js';
import { suiteVerifyDefaults } from '$lib/server/domain/exchange-runner/verify-defaults.js';
import { runInContext } from '$lib/server/util/provider/provider-ctx.js';

import { GET } from './+server.js';

type Payload = {
	exchangeId?: string;
	workflowId?: string;
	protocols?: Record<string, unknown>;
	code?: number;
	message?: string;
	hint?: string;
};

async function withCtx<T>(fn: () => Promise<T>): Promise<T> {
	const ctx = await buildAppContext({ CONTEXT: 'test' });
	return runInContext(ctx, fn);
}

async function callGet(
	exchangeId: string,
	workflow?: string
): Promise<{ status: number; payload: Payload }> {
	const url = new URL(
		`http://localhost/api/exchange-runner/${exchangeId}/protocols${
			workflow ? `?workflow=${workflow}` : ''
		}`
	);
	const response = await GET({ params: { exchangeId }, url });
	return { status: response.status, payload: (await response.json()) as Payload };
}

// `buildAppContext` dynamically imports the whole test context (wallet crypto
// included), which is slow enough to trip the 5s default when the three Vitest
// projects run in parallel. Same allowance as the sibling runner route tests.
describe('GET /api/exchange-runner/[exchangeId]/protocols', { timeout: 20_000 }, () => {
	it('returns { exchangeId, protocols, workflowId } for a claim exchange it did not mint', async () => {
		await withCtx(async () => {
			const { exchangeId } = await transactionServiceClient().createIssuanceExchange({
				retrievalId: 'r-1',
				credential: { id: 'urn:uuid:test-credential' }
			});

			const { status, payload } = await callGet(exchangeId, 'claim');

			expect(status).toBe(200);
			expect(payload.exchangeId).toBe(exchangeId);
			expect(payload.workflowId).toBe('claim');
			expect(payload.protocols?.iu).toBe(`http://fake.test/interactions/${exchangeId}`);
			expect(payload.protocols?.OID4VCI).toMatch(
				/^openid-credential-offer:\/\/\?credential_offer_uri=/
			);
		});
	});

	it('returns the verify protocols when ?workflow=verify', async () => {
		await withCtx(async () => {
			const { exchangeId } = await transactionServiceClient().createVerificationExchange({
				vprCredentialType: suiteVerifyDefaults.vprCredentialType,
				vprContext: suiteVerifyDefaults.vprContext
			});

			const { status, payload } = await callGet(exchangeId, 'verify');

			expect(status).toBe(200);
			expect(payload.workflowId).toBe('verify');
			expect(payload.protocols?.vcapi).toBe(
				`http://fake.test/workflows/verify/exchanges/${exchangeId}`
			);
		});
	});

	it('defaults an absent or unrecognised ?workflow to claim', async () => {
		await withCtx(async () => {
			const { exchangeId } = await transactionServiceClient().createIssuanceExchange({
				retrievalId: 'r-2',
				credential: { id: 'urn:uuid:test-credential' }
			});

			expect((await callGet(exchangeId)).payload.workflowId).toBe('claim');
			expect((await callGet(exchangeId, 'nonsense')).payload.workflowId).toBe('claim');
		});
	});

	it('maps a TransactionServiceError the way the sibling poll route does', async () => {
		await withCtx(async () => {
			// Unknown id → the client throws a 404 TransactionServiceError, which
			// passes through (only 5xx is rewritten to 502).
			const { status, payload } = await callGet('no-such-exchange', 'claim');

			expect(status).toBe(404);
			expect(payload).toEqual({ code: 404, message: 'Transaction service responded 404' });
		});
	});

	it('503s with the setup hint when the exchange runner is disabled', async () => {
		const ctx = await buildAppContext({ CONTEXT: 'test' });
		const disabled: AppContext = {
			...ctx,
			...provideFakeTransactionServiceClient({ enabled: false })
		};

		const { status, payload } = await runInContext(disabled, () => callGet('anything', 'claim'));

		expect(status).toBe(503);
		expect(payload.code).toBe(503);
		expect(payload.message).toBe('Exchange runner disabled');
		expect(payload.hint).toContain('EXCHANGE_RUNNER_ENABLED=true');
	});
});

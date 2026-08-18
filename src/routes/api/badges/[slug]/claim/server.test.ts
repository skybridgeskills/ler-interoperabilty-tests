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
};

const validAward = {
	requirementsMet: 3,
	requirementsTotal: 4,
	scenarioCount: 2,
	claimedAt: '2026-08-18T00:00:00Z'
};

async function withCtx<T>(fn: () => Promise<T>, opts: { enabled?: boolean } = {}): Promise<T> {
	const ctx = await buildAppContext({ CONTEXT: 'test' });
	const scoped =
		opts.enabled === false
			? { ...ctx, exchangeRunnerConfig: { ...ctx.exchangeRunnerConfig, enabled: false } }
			: ctx;
	return runInContext(scoped, fn);
}

async function callPost(
	slug: string,
	body?: unknown
): Promise<{ status: number; payload: Payload }> {
	const request = new Request(`http://localhost/api/badges/${slug}/claim`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		...(body === undefined ? {} : { body: JSON.stringify(body) })
	});
	const response = await POST({ request, params: { slug } } as Parameters<typeof POST>[0]);
	return { status: response.status, payload: (await response.json()) as Payload };
}

/** The credential document the fake stored for a minted exchange. */
function mintedCredential(exchangeId: string): Record<string, unknown> {
	const stored = asFakeTransactionServiceClient(transactionServiceClient()).getStored(exchangeId);
	return JSON.parse(String(stored?.variables?.vc)) as Record<string, unknown>;
}

// `buildAppContext` dynamically imports the whole test context, slow enough to
// trip the 5s default when the three Vitest projects run in parallel. Same
// allowance as the sibling runner route tests.
describe('POST /api/badges/[slug]/claim', { timeout: 20_000 }, () => {
	it('404s an unknown badge slug', async () => {
		await withCtx(async () => {
			const { status, payload } = await callPost('no-such-badge', validAward);
			expect(status).toBe(404);
			expect(payload.message).toContain('no-such-badge');
		});
	});

	it('503s when the exchange runner is disabled', async () => {
		await withCtx(
			async () => {
				const { status, payload } = await callPost('oid4-wallet', validAward);
				expect(status).toBe(503);
				expect(payload.message).toBe('Exchange runner disabled');
			},
			{ enabled: false }
		);
	});

	it('400s a malformed body', async () => {
		await withCtx(async () => {
			const { status, payload } = await callPost('oid4-wallet', { requirementsMet: -1 });
			expect(status).toBe(400);
			expect(payload.message).toBe('Malformed badge claim');
		});
	});

	it('mints a claim exchange carrying the badge document and returns the exchange result', async () => {
		await withCtx(async () => {
			const { status, payload } = await callPost('oid4-wallet', validAward);

			expect(status).toBe(200);
			expect(payload.workflowId).toBe('claim');
			expect(payload.exchangeId).toBeTruthy();
			expect(payload.protocols).toBeTruthy();

			const credential = mintedCredential(payload.exchangeId!);
			const subject = credential.credentialSubject as Record<string, unknown>;
			const achievement = subject.achievement as Record<string, unknown>;
			expect(credential.type).toEqual(['VerifiableCredential', 'OpenBadgeCredential']);
			expect(achievement.id).toBe('http://localhost:5173/badges/oid4-wallet');
		});
	});

	it('rides the badge slug into the exchange as the exchangeIdPrefix', async () => {
		await withCtx(async () => {
			const { payload } = await callPost('oid4-wallet', validAward);
			const stored = asFakeTransactionServiceClient(transactionServiceClient()).getStored(
				payload.exchangeId!
			);
			expect(stored?.variables?.exchangeIdPrefix).toBe('oid4-wallet');
		});
	});
});

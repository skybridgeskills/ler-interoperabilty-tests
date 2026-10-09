import { describe, expect, it } from 'vitest';

import { buildAppContext } from '$lib/server/build-app-context.js';
import { runInContext } from '$lib/server/util/provider/provider-ctx.js';

import { POST } from './+server.js';

async function callPost(body: unknown): Promise<{ status: number; payload: unknown }> {
	const ctx = await buildAppContext({ CONTEXT: 'test' });
	return runInContext(ctx, async () => {
		const request = new Request('http://localhost/api/scenario-runner/receive', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: typeof body === 'string' ? body : JSON.stringify(body)
		});
		const response = await POST({ request });
		const payload: unknown = await response.json();
		return { status: response.status, payload };
	});
}

const OK = {
	transport: 'vcalm' as const,
	input: 'https://issuer.test/exchanges/ex-1'
};

// `buildAppContext` dynamically imports the whole test context (wallet crypto
// included), which is slow enough to trip the 5s default when the three Vitest
// projects run in parallel. Same allowance as the sibling runner route tests.
describe('POST /api/scenario-runner/receive', { timeout: 20_000 }, () => {
	it('receives a credential and returns the flow summary (Fake provider)', async () => {
		const { status, payload } = await callPost(OK);
		expect(status).toBe(200);
		const body = payload as {
			flow: { transport: string; verified: boolean };
			credential?: unknown;
			delivered: boolean;
		};
		expect(body.flow.transport).toBe('vcalm');
		expect(body.flow.verified).toBe(true);
		expect(body.delivered).toBe(true);
		expect(body.credential).toBeDefined();
	});

	it('returns delivered:false for a delivery miss — 200, not an error', async () => {
		const { status, payload } = await callPost({
			...OK,
			input: 'https://issuer.test/exchanges/miss'
		});
		expect(status).toBe(200);
		const body = payload as { delivered: boolean; error?: { message: string } };
		expect(body.delivered).toBe(false);
		expect(body.error?.message).toBeTruthy();
	});

	it('records a delivered-but-unverified credential rather than failing the call', async () => {
		const { status, payload } = await callPost({
			...OK,
			input: 'https://issuer.test/exchanges/unverified'
		});
		expect(status).toBe(200);
		const body = payload as { delivered: boolean; flow: { verified: boolean } };
		expect(body.delivered).toBe(true);
		expect(body.flow.verified).toBe(false);
	});

	it('400s when the input is blank', async () => {
		const { status } = await callPost({ ...OK, input: '' });
		expect(status).toBe(400);
	});

	it('400s for an unknown transport', async () => {
		const { status } = await callPost({ ...OK, transport: 'carrier-pigeon' });
		expect(status).toBe(400);
	});

	it('400s for a malformed body', async () => {
		const { status } = await callPost({ nope: true });
		expect(status).toBe(400);
	});

	it('400s on non-JSON body', async () => {
		const { status } = await callPost('not-json');
		expect(status).toBe(400);
	});
});

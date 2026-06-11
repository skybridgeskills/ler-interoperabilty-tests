import { describe, expect, it } from 'vitest';

import { buildAppContext } from '$lib/server/build-app-context.js';
import { runInContext } from '$lib/server/util/provider/provider-ctx.js';

import { POST } from './+server.js';

async function callPost(body: unknown): Promise<{ status: number; payload: unknown }> {
	const ctx = await buildAppContext({ CONTEXT: 'test' });
	return runInContext(ctx, async () => {
		const request = new Request('http://localhost/api/wallet-runner/accept', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		const response = await POST({ request });
		const payload: unknown = await response.json();
		return { status: response.status, payload };
	});
}

// Generous timeout: this route test uses the fake wallet client (no crypto) and is fast in
// isolation, but can be starved under the parallel run's CPU-heavy crypto tests.
describe('POST /api/wallet-runner/accept', { timeout: 20_000 }, () => {
	it('runs the (fake) wallet and returns a conformance report', async () => {
		const { status, payload } = await callPost({
			profile: 'vcalm',
			exchange: { exchangeId: 'ex-1', protocols: { vcapi: 'https://tx.test/exchanges/ex-1' } }
		});
		expect(status).toBe(200);
		const body = payload as { exchange: { state: string }; report: { verified: boolean } };
		expect(body.exchange.state).toBe('complete');
		expect(body.report.verified).toBe(true);
	});

	it('rejects a malformed body with 400', async () => {
		const { status } = await callPost({ profile: 'vcalm' });
		expect(status).toBe(400);
	});
});

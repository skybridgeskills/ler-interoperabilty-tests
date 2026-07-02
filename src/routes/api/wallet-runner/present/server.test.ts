import { describe, expect, it } from 'vitest';

import { buildAppContext } from '$lib/server/build-app-context.js';
import { runInContext } from '$lib/server/util/provider/provider-ctx.js';

import { POST } from './+server.js';

async function callPost(body: unknown): Promise<{ status: number; payload: unknown }> {
	const ctx = await buildAppContext({ CONTEXT: 'test' });
	return runInContext(ctx, async () => {
		const request = new Request('http://localhost/api/wallet-runner/present', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		const response = await POST({ request });
		const payload: unknown = await response.json();
		return { status: response.status, payload };
	});
}

// Generous timeout: fake-client route, starved under the parallel crypto tests.
describe('POST /api/wallet-runner/present', { timeout: 20_000 }, () => {
	it('runs the (fake) wallet presentation and returns a conformance report', async () => {
		const { status, payload } = await callPost({
			request: {
				client_id: 'https://verifier.test',
				response_uri: 'https://verifier.test/oid4vp/response',
				response_mode: 'direct_post',
				nonce: 'n-1',
				presentation_definition: { id: 'd', input_descriptors: [{ id: 'ob3' }] }
			}
		});
		expect(status).toBe(200);
		const body = payload as { matched: boolean; report: { verified: boolean } };
		expect(body.matched).toBe(true);
		expect(body.report.verified).toBe(true);
	});

	it('rejects a malformed body with 400', async () => {
		const { status } = await callPost({ cryptosuite: 'eddsa-rdfc-2022' });
		expect(status).toBe(400);
	});
});

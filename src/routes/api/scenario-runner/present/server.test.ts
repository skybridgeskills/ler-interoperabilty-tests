import { describe, expect, it } from 'vitest';

import { buildAppContext } from '$lib/server/build-app-context.js';
import { runInContext } from '$lib/server/util/provider/provider-ctx.js';

import { POST } from './+server.js';

async function callPost(body: unknown): Promise<{ status: number; payload: unknown }> {
	const ctx = await buildAppContext({ CONTEXT: 'test' });
	return runInContext(ctx, async () => {
		const request = new Request('http://localhost/api/scenario-runner/present', {
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
	credential: 'minimal-ob3',
	transport: 'vcalm' as const,
	interactionUrl: 'https://verifier.test/interactions/ex-1'
};

describe('POST /api/scenario-runner/present', () => {
	it('presents a known recipe and returns request + present evidence (Fake provider)', async () => {
		const { status, payload } = await callPost(OK);
		expect(status).toBe(200);
		const body = payload as {
			request: { vcapiAdvertised: boolean; vprMatched: boolean };
			present: { submitted: boolean };
		};
		expect(body.request.vcapiAdvertised).toBe(true);
		expect(body.request.vprMatched).toBe(true);
		expect(body.present.submitted).toBe(true);
	});

	it('returns submitted:false for a transport miss — 200, not an error', async () => {
		const { status, payload } = await callPost({
			...OK,
			interactionUrl: 'https://verifier.test/interactions/miss'
		});
		expect(status).toBe(200);
		expect((payload as { present: { submitted: boolean } }).present.submitted).toBe(false);
	});

	it('400s when the interaction URL is blank', async () => {
		const { status } = await callPost({ ...OK, interactionUrl: '' });
		expect(status).toBe(400);
	});

	it('400s for an unknown recipe id', async () => {
		const { status, payload } = await callPost({ ...OK, credential: 'no-such-recipe' });
		expect(status).toBe(400);
		expect((payload as { message: string }).message).toMatch(/unknown credential recipe/i);
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

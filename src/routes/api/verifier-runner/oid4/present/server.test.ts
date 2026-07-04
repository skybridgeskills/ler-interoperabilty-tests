import { describe, expect, it } from 'vitest';

import { buildAppContext } from '$lib/server/build-app-context.js';
import { runInContext } from '$lib/server/util/provider/provider-ctx.js';

import { POST } from './+server.js';
import type { PresentResponse } from './present-schemas.js';

async function callPost(body: unknown): Promise<{ status: number; payload: unknown }> {
	const ctx = await buildAppContext({ CONTEXT: 'test' });
	return runInContext(ctx, async () => {
		const request = new Request('http://localhost/api/verifier-runner/oid4/present', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: typeof body === 'string' ? body : JSON.stringify(body)
		});
		const response = await POST({ request });
		const payload: unknown = await response.json();
		return { status: response.status, payload };
	});
}

const ENTRY = { passId: 'pass-1', label: 'Credential 1', kind: 'valid' as const };

describe('POST /api/verifier-runner/oid4/present', { timeout: 30_000 }, () => {
	it('returns present evidence + activity for one entry (Fake provider)', async () => {
		const { status, payload } = await callPost({
			entry: ENTRY,
			input: 'openid4vp://?request_uri=https%3A%2F%2Fverifier.example%2Freq'
		});
		expect(status).toBe(200);
		const body = payload as PresentResponse;
		expect(body.evidence.passId).toBe('pass-1');
		expect(body.evidence.submitted).toBe(true);
		expect(body.evidence.credential).toBeDefined();
		expect(body.activity.length).toBeGreaterThan(0);
	});

	it('400s when the entry is missing', async () => {
		const { status } = await callPost({ input: 'https://v.test/req' });
		expect(status).toBe(400);
	});

	it('400s when input is missing', async () => {
		const { status } = await callPost({ entry: ENTRY });
		expect(status).toBe(400);
	});

	it('400s on non-JSON body', async () => {
		const { status, payload } = await callPost('not-json');
		expect(status).toBe(400);
		expect((payload as { error: { message: string } }).error.message).toMatch(/JSON/);
	});
});

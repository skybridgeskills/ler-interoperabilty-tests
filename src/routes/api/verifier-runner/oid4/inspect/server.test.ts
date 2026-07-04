import { describe, expect, it } from 'vitest';

import { buildAppContext } from '$lib/server/build-app-context.js';
import { OID4_FLOOR_ROW_IDS } from '$lib/server/domain/verifier-runner/index.js';
import { runInContext } from '$lib/server/util/provider/provider-ctx.js';

import { POST } from './+server.js';
import type { InspectResponse } from './inspect-schemas.js';

async function callPost(body: unknown): Promise<{ status: number; payload: unknown }> {
	const ctx = await buildAppContext({ CONTEXT: 'test' });
	return runInContext(ctx, async () => {
		const request = new Request('http://localhost/api/verifier-runner/oid4/inspect', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: typeof body === 'string' ? body : JSON.stringify(body)
		});
		const response = await POST({ request });
		const payload: unknown = await response.json();
		return { status: response.status, payload };
	});
}

describe('POST /api/verifier-runner/oid4/inspect', { timeout: 30_000 }, () => {
	it('returns the floor outcomes, activity, and a request summary (Fake provider)', async () => {
		const { status, payload } = await callPost({
			input: 'openid4vp://?request_uri=https%3A%2F%2Fverifier.example%2Freq'
		});
		expect(status).toBe(200);
		const body = payload as InspectResponse;
		expect(body.outcomes.map((o) => o.id).sort()).toEqual(Object.values(OID4_FLOOR_ROW_IDS).sort());
		expect(body.outcomes.every((o) => o.source === 'automated')).toBe(true);
		expect(body.activity.length).toBeGreaterThan(0);
		expect(body.requestSummary).toMatchObject({
			clientId: 'https://verifier.example',
			responseUri: 'https://verifier.example/direct-post',
			responseMode: 'direct_post',
			form: 'by-reference',
			noncePresent: true
		});
	});

	it('400s when input is missing', async () => {
		const { status, payload } = await callPost({ cryptosuite: 'eddsa-rdfc-2022' });
		expect(status).toBe(400);
		expect((payload as { error: { message: string } }).error.message).toMatch(/Bad request/);
	});

	it('400s on a cryptosuite outside the enum', async () => {
		const { status } = await callPost({ input: 'https://v.test/req', cryptosuite: 'rsa-2048' });
		expect(status).toBe(400);
	});

	it('400s on non-JSON body', async () => {
		const { status, payload } = await callPost('not-json');
		expect(status).toBe(400);
		expect((payload as { error: { message: string } }).error.message).toMatch(/JSON/);
	});
});

import { describe, expect, it } from 'vitest';

import { rawScoreFixture } from '$lib/interop/additive-profiles/open-skill-alignment/fixtures/raw-score.js';
import { buildAppContext } from '$lib/server/build-app-context.js';
import { runInContext } from '$lib/server/util/provider/provider-ctx.js';

import { POST } from './+server.js';

async function callPost(body: unknown): Promise<{ status: number; payload: unknown }> {
	const ctx = await buildAppContext({ CONTEXT: 'test' });
	return runInContext(ctx, async () => {
		const request = new Request('http://localhost/api/issuer-runner/verify', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: typeof body === 'string' ? body : JSON.stringify(body)
		});
		const response = await POST({ request });
		const payload: unknown = await response.json();
		return { status: response.status, payload };
	});
}

describe('POST /api/issuer-runner/verify', { timeout: 30_000 }, () => {
	it('returns a passing report for a clean fixture (additive on)', async () => {
		const { status, payload } = await callPost({
			credential: rawScoreFixture,
			includeAdditive: true
		});
		expect(status).toBe(200);
		const report = payload as { verified: boolean; groups: unknown[] };
		expect(report.verified).toBe(true);
		expect(report.groups).toHaveLength(2);
	});

	it('returns a base-only report when includeAdditive is omitted', async () => {
		const { status, payload } = await callPost({ credential: rawScoreFixture });
		expect(status).toBe(200);
		expect((payload as { groups: unknown[] }).groups).toHaveLength(1);
	});

	it('400s on non-JSON body', async () => {
		const { status, payload } = await callPost('not-json');
		expect(status).toBe(400);
		expect((payload as { fatalError: { message: string } }).fatalError.message).toMatch(/JSON/);
	});

	it('400s on a malformed request shape (missing credential)', async () => {
		const { status, payload } = await callPost({ includeAdditive: true });
		expect(status).toBe(400);
		expect((payload as { fatalError: { message: string } }).fatalError.message).toMatch(
			/Bad request/
		);
	});
});

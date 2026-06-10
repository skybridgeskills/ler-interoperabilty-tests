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
	it('returns a passing report for a clean fixture (open-skill selected)', async () => {
		const { status, payload } = await callPost({
			credential: rawScoreFixture,
			additiveProfiles: ['open-skill-alignment']
		});
		expect(status).toBe(200);
		const report = payload as { verified: boolean; groups: unknown[] };
		expect(report.verified).toBe(true);
		expect(report.groups).toHaveLength(2);
	});

	it('includes both additive groups when both are selected', async () => {
		const { status, payload } = await callPost({
			credential: rawScoreFixture,
			additiveProfiles: ['open-skill-alignment', 'data-integrity-cryptosuites']
		});
		expect(status).toBe(200);
		const report = payload as {
			groups: { checklist: { profileSlug: string } }[];
		};
		expect(report.groups).toHaveLength(3);
		const slugs = report.groups.map((g) => g.checklist.profileSlug);
		expect(slugs).toContain('data-integrity-cryptosuites');
	});

	it('returns a base-only report when additiveProfiles is omitted', async () => {
		const { status, payload } = await callPost({ credential: rawScoreFixture });
		expect(status).toBe(200);
		expect((payload as { groups: unknown[] }).groups).toHaveLength(1);
	});

	it('400s on an invalid additive slug', async () => {
		const { status, payload } = await callPost({
			credential: rawScoreFixture,
			additiveProfiles: ['not-a-real-additive']
		});
		expect(status).toBe(400);
		expect((payload as { fatalError: { message: string } }).fatalError.message).toMatch(
			/Bad request/
		);
	});

	it('400s on non-JSON body', async () => {
		const { status, payload } = await callPost('not-json');
		expect(status).toBe(400);
		expect((payload as { fatalError: { message: string } }).fatalError.message).toMatch(/JSON/);
	});

	it('400s on a malformed request shape (additiveProfiles not an array)', async () => {
		const { status, payload } = await callPost({
			credential: rawScoreFixture,
			additiveProfiles: 'open-skill-alignment'
		});
		expect(status).toBe(400);
		expect((payload as { fatalError: { message: string } }).fatalError.message).toMatch(
			/Bad request/
		);
	});
});

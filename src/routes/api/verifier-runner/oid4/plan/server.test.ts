import { describe, expect, it } from 'vitest';

import type { VerifierRunPlan } from '$lib/interop/verifier-run/index.js';
import { buildAppContext } from '$lib/server/build-app-context.js';
import { runInContext } from '$lib/server/util/provider/provider-ctx.js';

import { POST } from './+server.js';

async function callPost(body?: unknown): Promise<{ status: number; payload: unknown }> {
	const ctx = await buildAppContext({ CONTEXT: 'test' });
	return runInContext(ctx, async () => {
		const request = new Request('http://localhost/api/verifier-runner/oid4/plan', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body)
		});
		const response = await POST({ request });
		const payload: unknown = await response.json();
		return { status: response.status, payload };
	});
}

describe('POST /api/verifier-runner/oid4/plan', { timeout: 30_000 }, () => {
	it('returns a credential-less four-entry oid4 plan (empty body)', async () => {
		const { status, payload } = await callPost();
		expect(status).toBe(200);
		const plan = payload as VerifierRunPlan;
		expect(plan.profile).toBe('oid4');
		expect(plan.workflow).toBe('credential-request-and-verification');
		expect(plan.entries).toHaveLength(4);
		expect(plan.entries.every((e) => !('credential' in e))).toBe(true);
		expect(new Set(plan.entries.map((e) => e.kind)).size).toBe(4);
	});

	it('accepts an explicit cryptosuite', async () => {
		const { status, payload } = await callPost({ cryptosuite: 'ecdsa-rdfc-2019' });
		expect(status).toBe(200);
		expect((payload as VerifierRunPlan).cryptosuite).toBe('ecdsa-rdfc-2019');
	});

	it('400s on a cryptosuite outside the enum', async () => {
		const { status } = await callPost({ cryptosuite: 'rsa-2048' });
		expect(status).toBe(400);
	});

	it('400s on non-JSON body', async () => {
		const { status, payload } = await callPost('not-json');
		expect(status).toBe(400);
		expect((payload as { error: { message: string } }).error.message).toMatch(/JSON/);
	});
});

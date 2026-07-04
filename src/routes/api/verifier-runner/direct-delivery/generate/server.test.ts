import { describe, expect, it } from 'vitest';

import type { VerifierRunDefinition } from '$lib/interop/verifier-run/index.js';
import { buildAppContext } from '$lib/server/build-app-context.js';
import { runInContext } from '$lib/server/util/provider/provider-ctx.js';

import { POST } from './+server.js';

async function callPost(body?: unknown): Promise<{ status: number; payload: unknown }> {
	const ctx = await buildAppContext({ CONTEXT: 'test' });
	return runInContext(ctx, async () => {
		const request = new Request('http://localhost/api/verifier-runner/direct-delivery/generate', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body)
		});
		const response = await POST({ request });
		const payload: unknown = await response.json();
		return { status: response.status, payload };
	});
}

describe('POST /api/verifier-runner/direct-delivery/generate', { timeout: 30_000 }, () => {
	it('returns a run with each pass kind exactly once (default cryptosuite)', async () => {
		const { status, payload } = await callPost({});
		expect(status).toBe(200);
		const run = payload as VerifierRunDefinition;
		expect(run.profile).toBe('ob3-direct-delivery');
		expect(run.workflow).toBe('direct-credential-verification');
		expect(run.cryptosuite).toBe('eddsa-rdfc-2022');
		expect(run.passes).toHaveLength(4);
		expect([...run.passes.map((p) => p.kind)].sort()).toEqual([
			'broken-signature',
			'expired',
			'schema-problem',
			'valid'
		]);
		expect(run.passes.map((p) => p.label)).toEqual([
			'Credential 1',
			'Credential 2',
			'Credential 3',
			'Credential 4'
		]);
		expect(run.passes.every((p) => p.credential !== undefined)).toBe(true);
	});

	it('accepts an empty body as defaults', async () => {
		const { status, payload } = await callPost();
		expect(status).toBe(200);
		expect((payload as VerifierRunDefinition).cryptosuite).toBe('eddsa-rdfc-2022');
	});

	it('honors an explicit cryptosuite', async () => {
		const { status, payload } = await callPost({ cryptosuite: 'ecdsa-rdfc-2019' });
		expect(status).toBe(200);
		expect((payload as VerifierRunDefinition).cryptosuite).toBe('ecdsa-rdfc-2019');
	});

	it('400s on an unknown cryptosuite', async () => {
		const { status, payload } = await callPost({ cryptosuite: 'rsa-1997' });
		expect(status).toBe(400);
		expect((payload as { error: { message: string } }).error.message).toMatch(/Bad request/);
	});

	it('400s on non-JSON body', async () => {
		const { status, payload } = await callPost('not-json');
		expect(status).toBe(400);
		expect((payload as { error: { message: string } }).error.message).toMatch(/JSON/);
	});
});

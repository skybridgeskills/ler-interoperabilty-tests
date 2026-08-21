import { describe, expect, it } from 'vitest';

import { buildAppContext } from '$lib/server/build-app-context.js';
import { runInContext } from '$lib/server/util/provider/provider-ctx.js';

import { POST } from './+server.js';

async function callPost(body: unknown): Promise<{ status: number; payload: unknown }> {
	const ctx = await buildAppContext({ CONTEXT: 'test' });
	return runInContext(ctx, async () => {
		const request = new Request('http://localhost/api/scenario-runner/deliver-direct', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: typeof body === 'string' ? body : JSON.stringify(body)
		});
		const response = await POST({ request });
		const payload: unknown = await response.json();
		return { status: response.status, payload };
	});
}

describe('POST /api/scenario-runner/deliver-direct', () => {
	it('signs a known recipe and returns the credential (Fake provider)', async () => {
		const { status, payload } = await callPost({ credential: 'minimal-ob3' });
		expect(status).toBe(200);
		const credential = (payload as { credential: { type: string[]; proof: unknown } }).credential;
		expect(credential.type).toContain('OpenBadgeCredential');
		expect(credential.proof).toBeDefined();
	});

	it("forwards tamper: 'proof' so the deliverable is corrupted", async () => {
		const clean = await callPost({ credential: 'minimal-ob3' });
		const tampered = await callPost({ credential: 'minimal-ob3', tamper: 'proof' });
		const cleanProof = (clean.payload as { credential: { proof: { proofValue: string } } })
			.credential.proof.proofValue;
		const tamperedProof = (tampered.payload as { credential: { proof: { proofValue: string } } })
			.credential.proof.proofValue;
		expect(tamperedProof).not.toBe(cleanProof);
	});

	it('400s for an unknown recipe id', async () => {
		const { status, payload } = await callPost({ credential: 'no-such-recipe' });
		expect(status).toBe(400);
		expect((payload as { message: string }).message).toMatch(/unknown credential recipe/i);
	});

	it('400s for a malformed body', async () => {
		const { status } = await callPost({ nope: true });
		expect(status).toBe(400);
	});
});

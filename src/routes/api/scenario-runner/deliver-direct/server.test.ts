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

	/**
	 * M15 P2: this route signs LOCALLY, so its cryptosuite is the action's own
	 * choice and is always servable. It used to resolve `action.intent` through
	 * `resolveIssuingContext` — the tenant map — and 400 an unservable pin, even
	 * though `wallet-crypto` can sign either bundle suite unconditionally.
	 *
	 * The test context is a single-tenant EdDSA deployment, so an ECDSA request
	 * here is exactly the case that used to fail.
	 */
	it('signs with a non-default cryptosuite on a single-tenant deployment', async () => {
		const { status, payload } = await callPost({
			credential: 'minimal-ob3',
			cryptosuite: 'ecdsa-rdfc-2019'
		});

		expect(status).toBe(200);
		// Assert the PROOF, not just the 200 — the point is what actually got
		// signed, and a route that ignored the field would still answer 200.
		const proof = (payload as { credential: { proof: { cryptosuite: string } } }).credential.proof;
		expect(proof.cryptosuite).toBe('ecdsa-rdfc-2019');
	});

	it('falls back to the deployment’s configured suite when the action names none', async () => {
		const { payload } = await callPost({ credential: 'minimal-ob3' });
		const proof = (payload as { credential: { proof: { cryptosuite: string } } }).credential.proof;
		expect(proof.cryptosuite).toBe('eddsa-rdfc-2022');
	});

	it('rejects a cryptosuite outside the locally-signable set', async () => {
		// The `isSignableSuite` guard is NOT the tenant check M15 removed — it
		// catches a different failure: a DEPLOYMENT configured with a suite
		// `wallet-crypto` cannot sign at all. Reachable through the wire schema for
		// an unknown value; a misconfigured deployment reaches the same branch.
		const { status, payload } = await callPost({
			credential: 'minimal-ob3',
			cryptosuite: 'bbs-2023'
		});
		expect(status).toBe(400);
		expect((payload as { message: string }).message).toMatch(
			/unrecognised deliver-direct request/i
		);
	});
});

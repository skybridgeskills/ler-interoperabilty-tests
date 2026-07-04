import { describe, expect, it } from 'vitest';

import type {
	PassAttestation,
	VerifierRunDefinition,
	VerifierRunnerReport
} from '$lib/interop/verifier-run/index.js';
import { buildAppContext } from '$lib/server/build-app-context.js';
import { fakeGenerateRun, REVOKED_ROW_ID } from '$lib/server/domain/verifier-runner/index.js';
import { runInContext } from '$lib/server/util/provider/provider-ctx.js';

import { POST } from './+server.js';

async function callPost(body: unknown): Promise<{ status: number; payload: unknown }> {
	const ctx = await buildAppContext({ CONTEXT: 'test' });
	return runInContext(ctx, async () => {
		const request = new Request('http://localhost/api/verifier-runner/direct-delivery/score', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: typeof body === 'string' ? body : JSON.stringify(body)
		});
		const response = await POST({ request });
		const payload: unknown = await response.json();
		return { status: response.status, payload };
	});
}

function correctAttestations(run: VerifierRunDefinition): PassAttestation[] {
	return run.passes.map((pass) =>
		pass.kind === 'valid'
			? { passId: pass.passId, verdict: 'accepted' as const }
			: { passId: pass.passId, verdict: 'rejected' as const }
	);
}

describe('POST /api/verifier-runner/direct-delivery/score', { timeout: 30_000 }, () => {
	it('scores a fully correct run as verified, with reveal + deferred revoked row', async () => {
		const run = await fakeGenerateRun({ cryptosuite: 'eddsa-rdfc-2022' });
		const { status, payload } = await callPost({ run, attestations: correctAttestations(run) });
		expect(status).toBe(200);
		const report = payload as VerifierRunnerReport;
		expect(report.verified).toBe(true);
		expect(report.failingMustCount).toBe(0);
		expect(report.groups).toHaveLength(1);
		expect(report.activity).toHaveLength(4);
		expect(report.artifacts).toHaveLength(4);

		const revoked = report.groups[0].outcomes.find((o) => o.id === REVOKED_ROW_ID);
		expect(revoked).toMatchObject({ status: 'n/a', source: 'automated' });
	});

	it('scores a wrong verdict as a failing report (200, not an error)', async () => {
		const run = await fakeGenerateRun({ cryptosuite: 'eddsa-rdfc-2022' });
		const attestations = correctAttestations(run).map(
			(a): PassAttestation => ({ ...a, verdict: 'accepted' })
		);
		const { status, payload } = await callPost({ run, attestations });
		expect(status).toBe(200);
		const report = payload as VerifierRunnerReport;
		expect(report.verified).toBe(false);
		expect(report.failingMustCount).toBe(3);
	});

	it('400s when attestations do not match the run passes', async () => {
		const run = await fakeGenerateRun({ cryptosuite: 'eddsa-rdfc-2022' });
		const attestations = correctAttestations(run).slice(1);
		const { status, payload } = await callPost({ run, attestations });
		expect(status).toBe(400);
		expect((payload as { error: { message: string } }).error.message).toMatch(/do not match/);
	});

	it('400s on a bad body shape (kind outside the enum)', async () => {
		const run = await fakeGenerateRun({ cryptosuite: 'eddsa-rdfc-2022' });
		const tampered = {
			...run,
			passes: run.passes.map((p, i) => (i === 0 ? { ...p, kind: 'revoked' } : p))
		};
		const { status, payload } = await callPost({
			run: tampered,
			attestations: correctAttestations(run)
		});
		expect(status).toBe(400);
		expect((payload as { error: { message: string } }).error.message).toMatch(/Bad request/);
	});

	it('400s on non-JSON body', async () => {
		const { status, payload } = await callPost('not-json');
		expect(status).toBe(400);
		expect((payload as { error: { message: string } }).error.message).toMatch(/JSON/);
	});
});

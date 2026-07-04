import { describe, expect, it } from 'vitest';

import type {
	PassAttestation,
	PresentEvidence,
	RejectionReason,
	VerifierRunnerReport,
	VerifierRunPlan
} from '$lib/interop/verifier-run/index.js';
import { buildAppContext } from '$lib/server/build-app-context.js';
import { runInContext } from '$lib/server/util/provider/provider-ctx.js';

import { POST as inspectPost } from '../inspect/+server.js';
import { POST as planPost } from '../plan/+server.js';
import { POST as presentPost } from '../present/+server.js';

import { POST as scorePost } from './+server.js';

const RESPONSE_ENDPOINT_ROW_ID = 'oid4.verifier-response-endpoint';
const INPUT = 'openid4vp://?request_uri=https%3A%2F%2Fverifier.example%2Freq';

const CORRECT_REASON: Record<string, RejectionReason> = {
	'broken-signature': 'signature',
	'schema-problem': 'schema',
	expired: 'expiry'
};

function req(path: string, body: unknown): Request {
	return new Request(`http://localhost${path}`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: typeof body === 'string' ? body : JSON.stringify(body)
	});
}

async function jsonOf(response: Response): Promise<unknown> {
	return response.json();
}

describe('POST /api/verifier-runner/oid4/score', { timeout: 30_000 }, () => {
	it('scores a full plan → inspect → present ×4 → score chain (verified)', async () => {
		const ctx = await buildAppContext({ CONTEXT: 'test' });
		const report = await runInContext(ctx, async () => {
			const plan = (await jsonOf(
				await planPost({ request: req('/api/verifier-runner/oid4/plan', {}) })
			)) as VerifierRunPlan;

			const inspect = (await jsonOf(
				await inspectPost({ request: req('/api/verifier-runner/oid4/inspect', { input: INPUT }) })
			)) as { outcomes: PresentEvidence[] };

			const evidence: PresentEvidence[] = [];
			for (const entry of plan.entries) {
				const present = (await jsonOf(
					await presentPost({
						request: req('/api/verifier-runner/oid4/present', { entry, input: INPUT })
					})
				)) as { evidence: PresentEvidence };
				evidence.push(present.evidence);
			}

			const attestations: PassAttestation[] = plan.entries.map((entry) =>
				entry.kind === 'valid'
					? { passId: entry.passId, verdict: 'accepted' }
					: { passId: entry.passId, verdict: 'rejected', reason: CORRECT_REASON[entry.kind] }
			);

			const response = await scorePost({
				request: req('/api/verifier-runner/oid4/score', {
					plan,
					evidence,
					attestations,
					floorOutcomes: inspect.outcomes
				})
			});
			expect(response.status).toBe(200);
			return (await jsonOf(response)) as VerifierRunnerReport;
		});

		expect(report.verified).toBe(true);
		const delivery = report.groups
			.flatMap((g) => g.outcomes)
			.find((o) => o.id === RESPONSE_ENDPOINT_ROW_ID);
		expect(delivery?.status).toBe('pass');
		expect(report.artifacts).toHaveLength(4);
	});

	it('400s on incoherent evidence (missing an entry)', async () => {
		const ctx = await buildAppContext({ CONTEXT: 'test' });
		const status = await runInContext(ctx, async () => {
			const plan = (await jsonOf(
				await planPost({ request: req('/api/verifier-runner/oid4/plan', {}) })
			)) as VerifierRunPlan;
			const attestations: PassAttestation[] = plan.entries.map((entry) =>
				entry.kind === 'valid'
					? { passId: entry.passId, verdict: 'accepted' }
					: { passId: entry.passId, verdict: 'rejected', reason: CORRECT_REASON[entry.kind] }
			);
			const response = await scorePost({
				request: req('/api/verifier-runner/oid4/score', {
					plan,
					evidence: [],
					attestations,
					floorOutcomes: []
				})
			});
			return response.status;
		});
		expect(status).toBe(400);
	});

	it('400s on non-JSON body', async () => {
		const ctx = await buildAppContext({ CONTEXT: 'test' });
		const status = await runInContext(ctx, async () => {
			const response = await scorePost({
				request: req('/api/verifier-runner/oid4/score', 'not-json')
			});
			return response.status;
		});
		expect(status).toBe(400);
	});
});

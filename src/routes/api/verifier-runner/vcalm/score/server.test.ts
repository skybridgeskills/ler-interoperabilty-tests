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

import { POST as planPost } from '../plan/+server.js';
import { POST as presentPost } from '../present/+server.js';

import { POST as scorePost } from './+server.js';

const EXCHANGE_ENDPOINT_ROW_ID = 'vcalm.verifier-exchange-endpoint';
const URL_IN = 'https://verifier.test/interactions/ex-1';

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

const jsonOf = (response: Response): Promise<unknown> => response.json();

describe('POST /api/verifier-runner/vcalm/score', { timeout: 30_000 }, () => {
	it('scores a full plan → present ×4 → score chain (verified)', async () => {
		const ctx = await buildAppContext({ CONTEXT: 'test' });
		const report = await runInContext(ctx, async () => {
			const plan = (await jsonOf(
				await planPost({ request: req('/api/verifier-runner/vcalm/plan', {}) })
			)) as VerifierRunPlan;

			const evidence: PresentEvidence[] = [];
			let floorOutcomes: unknown = [];
			for (const entry of plan.entries) {
				const present = (await jsonOf(
					await presentPost({
						request: req('/api/verifier-runner/vcalm/present', { entry, interactionUrl: URL_IN })
					})
				)) as { evidence: PresentEvidence; floorOutcomes: unknown };
				evidence.push(present.evidence);
				floorOutcomes = present.floorOutcomes; // keep the first pass's — all identical under the Fake
			}

			const attestations: PassAttestation[] = plan.entries.map((entry) =>
				entry.kind === 'valid'
					? { passId: entry.passId, verdict: 'accepted' }
					: { passId: entry.passId, verdict: 'rejected', reason: CORRECT_REASON[entry.kind] }
			);

			const response = await scorePost({
				request: req('/api/verifier-runner/vcalm/score', {
					plan,
					evidence,
					attestations,
					floorOutcomes
				})
			});
			expect(response.status).toBe(200);
			return (await jsonOf(response)) as VerifierRunnerReport;
		});

		expect(report.verified).toBe(true);
		const delivery = report.groups
			.flatMap((g) => g.outcomes)
			.find((o) => o.id === EXCHANGE_ENDPOINT_ROW_ID);
		expect(delivery?.status).toBe('pass');
		expect(report.artifacts).toHaveLength(4);
	});

	it('400s on incoherent evidence (missing an entry)', async () => {
		const ctx = await buildAppContext({ CONTEXT: 'test' });
		const status = await runInContext(ctx, async () => {
			const plan = (await jsonOf(
				await planPost({ request: req('/api/verifier-runner/vcalm/plan', {}) })
			)) as VerifierRunPlan;
			const attestations: PassAttestation[] = plan.entries.map((entry) =>
				entry.kind === 'valid'
					? { passId: entry.passId, verdict: 'accepted' }
					: { passId: entry.passId, verdict: 'rejected', reason: CORRECT_REASON[entry.kind] }
			);
			const response = await scorePost({
				request: req('/api/verifier-runner/vcalm/score', {
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
				request: req('/api/verifier-runner/vcalm/score', 'not-json')
			});
			return response.status;
		});
		expect(status).toBe(400);
	});
});

import { describe, expect, it } from 'vitest';

import { buildAppContext } from '$lib/server/build-app-context.js';
import { runInContext } from '$lib/server/util/provider/provider-ctx.js';

import { POST } from './+server.js';

async function callPost(body: unknown): Promise<{ status: number; payload: unknown }> {
	const ctx = await buildAppContext({ CONTEXT: 'test' });
	return runInContext(ctx, async () => {
		const request = new Request('http://localhost/api/wallet-runner/issuer-vcalm/run', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		const response = await POST({ request });
		const payload: unknown = await response.json();
		return { status: response.status, payload };
	});
}

describe('POST /api/wallet-runner/issuer-vcalm/run', () => {
	it('runs the (fake) issuer flow and returns a verified conformance report', async () => {
		const { status, payload } = await callPost({
			interactionUrl: 'https://issuer.test/interactions/ex-1'
		});
		expect(status).toBe(200);
		const body = payload as {
			verified: boolean;
			blocked: boolean;
			failingMustCount: number;
			report: { verified: boolean; groups: { outcomes: unknown[] }[] };
			raw: { delivery?: { credential?: unknown } };
		};
		expect(body.verified).toBe(true);
		expect(body.blocked).toBe(false);
		expect(body.failingMustCount).toBe(0);
		expect(body.report.groups[0].outcomes.length).toBeGreaterThan(0);
		expect(body.raw.delivery?.credential).toBeDefined();
	});

	it('runs a selected OSA additive against the delivered credential and reports its outcomes', async () => {
		const { status, payload } = await callPost({
			interactionUrl: 'https://issuer.test/interactions/ex-1',
			additiveProfiles: ['open-skill-alignment']
		});
		expect(status).toBe(200);
		const body = payload as {
			verified: boolean;
			failingMustCount: number;
			additiveOutcomes: { id: string; level: string; status: string }[];
			report: { groups: { checklist: { kind: string; profileSlug: string } }[] };
		};
		const additiveGroup = body.report.groups.find((g) => g.checklist.kind === 'additive');
		expect(additiveGroup?.checklist.profileSlug).toBe('open-skill-alignment');
		// The fake delivered credential carries no OSA result[]/resultDescription[] → OSA MUSTs fail,
		// which flips the whole run to not-verified.
		expect(body.additiveOutcomes.some((o) => o.level === 'MUST' && o.status === 'fail')).toBe(true);
		expect(body.verified).toBe(false);
		expect(body.failingMustCount).toBeGreaterThan(0);
	});

	it('rejects a malformed body with 400', async () => {
		const { status } = await callPost({ cryptosuite: 'eddsa-rdfc-2022' });
		expect(status).toBe(400);
	});
});

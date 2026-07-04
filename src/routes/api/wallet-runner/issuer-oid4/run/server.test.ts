import { describe, expect, it } from 'vitest';

import { buildAppContext } from '$lib/server/build-app-context.js';
import { runInContext } from '$lib/server/util/provider/provider-ctx.js';

import { POST } from './+server.js';

async function callPost(
	body: unknown
): Promise<{ status: number; payload: unknown; text: string }> {
	const ctx = await buildAppContext({ CONTEXT: 'test' });
	return runInContext(ctx, async () => {
		const request = new Request('http://localhost/api/wallet-runner/issuer-oid4/run', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		const response = await POST({ request });
		const text = await response.text();
		return { status: response.status, payload: JSON.parse(text), text };
	});
}

describe('POST /api/wallet-runner/issuer-oid4/run', () => {
	it('runs the (fake) OID4VCI issuer flow and returns a verified conformance report', async () => {
		const { status, payload, text } = await callPost({
			offerUrl: 'openid-credential-offer://?credential_offer_uri=https%3A%2F%2Fissuer.test%2Foffer'
		});
		expect(status).toBe(200);
		const body = payload as {
			verified: boolean;
			blocked: boolean;
			failingMustCount: number;
			report: { verified: boolean; groups: { outcomes: unknown[] }[] };
			raw: {
				delivery?: { credential?: unknown };
				token?: { redeemed?: boolean };
				transcript?: unknown[];
			};
			walletActivity: { id: string; kind: string; status: string; stepIndex?: number }[];
			artifacts: { kind: string; verified: boolean; title: string }[];
		};
		expect(body.verified).toBe(true);
		expect(body.blocked).toBe(false);
		expect(body.failingMustCount).toBe(0);
		expect(body.report.groups[0].outcomes.length).toBeGreaterThan(0);
		expect(body.raw.delivery?.credential).toBeDefined();
		expect(body.raw.token?.redeemed).toBe(true);
		expect(Array.isArray(body.raw.transcript)).toBe(true);

		// Normalized wallet run-response (additive): transcript-driven activity + artifact.
		expect(body.walletActivity.length).toBeGreaterThan(0);
		expect(body.walletActivity.at(-1)).toMatchObject({ id: 'verify', kind: 'check', status: 'ok' });
		expect(body.artifacts).toHaveLength(1);
		expect(body.artifacts[0]).toMatchObject({ kind: 'credential', verified: true });

		// The access token must never be serialized anywhere in the response: no
		// `access_token`/`accessToken` key, and `raw.token` exposes only the redacted shape.
		expect(text).not.toContain('access_token');
		expect(text).not.toContain('accessToken');
		expect(Object.keys(body.raw.token ?? {}).sort()).toEqual(['cNonce', 'redeemed']);
	});

	it('runs a selected OSA additive against the delivered credential and reports its outcomes', async () => {
		const { status, payload } = await callPost({
			offerUrl: 'openid-credential-offer://?credential_offer_uri=https%3A%2F%2Fissuer.test%2Foffer',
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

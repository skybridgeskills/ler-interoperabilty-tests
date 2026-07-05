import { describe, expect, it } from 'vitest';

import type { VcalmVerifierFlowResult } from '$lib/server/domain/wallet-client/drivers/vcalm-verifier-flow.js';
import type { TlsProbeResult } from '$lib/server/domain/wallet-client/index.js';

import { vcalmFloorOutcomes, VCALM_FLOOR_ROW_IDS as IDS } from './vpr-checks.js';

const tlsOk: TlsProbeResult = { ok: true, protocol: 'TLSv1.3', atLeastTls12: true };
const probeOk = async (): Promise<TlsProbeResult> => tlsOk;

function result(overrides: Partial<VcalmVerifierFlowResult> = {}): VcalmVerifierFlowResult {
	return {
		fetch: {
			ok: true,
			status: 200,
			protocols: { vcapi: 'https://verifier.test/vcapi/ex-1' },
			vcapiUrl: 'https://verifier.test/vcapi/ex-1',
			tls: tlsOk,
			rawBody: {}
		},
		vpr: { challenge: 'c', queries: [] },
		vprReceived: true,
		matched: true,
		didAuth: true,
		submitted: true,
		submissionStatus: 200,
		credential: {},
		holder: { did: 'did:key:zHolder', cryptosuite: 'eddsa-rdfc-2022' },
		...overrides
	};
}

function byId(outcomes: { id: string; status: string }[], id: string) {
	return outcomes.find((o) => o.id === id);
}

describe('vcalmFloorOutcomes', () => {
	it('passes every floor row for a healthy engagement', async () => {
		const { outcomes, activity } = await vcalmFloorOutcomes(result(), probeOk);
		expect(outcomes.map((o) => o.id).sort()).toEqual(Object.values(IDS).sort());
		expect(outcomes.every((o) => o.status === 'pass')).toBe(true);
		expect(outcomes.every((o) => o.source === 'automated')).toBe(true);
		expect(activity.length).toBeGreaterThan(0);
	});

	it('fails only the interaction row and n/a the rest when no vcapi resolved', async () => {
		const { outcomes } = await vcalmFloorOutcomes(
			result({ fetch: { ok: false, status: 502, rawBody: null, error: 'boom' } }),
			probeOk
		);
		expect(byId(outcomes, IDS.interactionEndpoint)?.status).toBe('fail');
		for (const id of [IDS.vprQuery, IDS.vprDidAuth, IDS.requestTls, IDS.responseTls]) {
			expect(byId(outcomes, id)?.status).toBe('n/a');
		}
	});

	it('fails the vpr-query row for a DID-auth-only VPR but passes vpr-didauth', async () => {
		const { outcomes } = await vcalmFloorOutcomes(
			result({ matched: false, matchReason: 'only DID auth', didAuth: true }),
			probeOk
		);
		expect(byId(outcomes, IDS.vprQuery)?.status).toBe('fail');
		expect(byId(outcomes, IDS.vprDidAuth)?.status).toBe('pass');
	});

	it('fails the vpr-query row when no presentation request was returned', async () => {
		const { outcomes } = await vcalmFloorOutcomes(
			result({ vprReceived: false, matched: false }),
			probeOk
		);
		expect(byId(outcomes, IDS.vprQuery)?.status).toBe('fail');
	});

	it('fails response-tls when the exchange host is not https', async () => {
		const probeHttp = async (): Promise<TlsProbeResult> => ({
			ok: false,
			atLeastTls12: false,
			error: 'Endpoint is not served over HTTPS.'
		});
		const { outcomes } = await vcalmFloorOutcomes(result(), probeHttp);
		expect(byId(outcomes, IDS.responseTls)?.status).toBe('fail');
	});
});

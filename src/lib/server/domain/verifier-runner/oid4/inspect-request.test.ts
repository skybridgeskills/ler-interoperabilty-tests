import { describe, expect, it } from 'vitest';

import type { TlsProbeResult } from '$lib/server/domain/wallet-client/index.js';
import type { WalletCrypto } from '$lib/server/domain/wallet-crypto/index.js';

import { OID4_FLOOR_ROW_IDS as IDS } from './inspect-checks.js';
import { inspectOid4Request } from './inspect-request.js';

const fakeCrypto = {
	generateKey: async (cryptosuite: string) => ({
		did: 'did:key:fake',
		verificationMethod: 'did:key:fake#0',
		cryptosuite
	}),
	issueCredential: async ({ credential }: { credential: Record<string, unknown> }) => credential
} as unknown as WalletCrypto;

const okTls: TlsProbeResult = { ok: true, protocol: 'TLSv1.3', atLeastTls12: true };
const fakeTlsProbe =
	(byUrl: Record<string, TlsProbeResult> = {}) =>
	async (url: string): Promise<TlsProbeResult> =>
		byUrl[url] ??
		(url.startsWith('https://')
			? okTls
			: { ok: false, atLeastTls12: false, error: 'Endpoint is not served over HTTPS.' });

const OB3_PD = {
	id: 'pd-1',
	format: { ldp_vp: {} },
	input_descriptors: [
		{
			id: 'ob3',
			constraints: {
				fields: [{ path: ['$.type'], filter: { contains: { const: 'OpenBadgeCredential' } } }]
			}
		}
	]
};

function validRequest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		client_id: 'https://v.test',
		response_uri: 'https://v.test/direct-post',
		response_mode: 'direct_post',
		nonce: 'n-1',
		presentation_definition: OB3_PD,
		...overrides
	};
}

/** Serve a sequence of JSON bodies; extra calls repeat the last one. */
function fetchSequence(bodies: unknown[]): { fetchImpl: typeof fetch; calls: () => number } {
	let count = 0;
	const fetchImpl = (async () => {
		const body = bodies[Math.min(count, bodies.length - 1)];
		count += 1;
		return new Response(JSON.stringify(body), {
			status: 200,
			headers: { 'content-type': 'application/json' }
		});
	}) as typeof fetch;
	return { fetchImpl, calls: () => count };
}

function inspect(input: string, fetchImpl: typeof fetch, tlsProbe = fakeTlsProbe()) {
	return inspectOid4Request({
		input,
		cryptosuite: 'eddsa-rdfc-2022',
		crypto: fakeCrypto,
		fetchImpl,
		tlsProbe
	});
}

const outcomeById = (result: { outcomes: { id: string; status: string; message: string }[] }) =>
	new Map(result.outcomes.map((o) => [o.id, o]));

describe('inspectOid4Request', () => {
	it('scores the full floor for a healthy by-reference request with fresh nonces', async () => {
		const { fetchImpl, calls } = fetchSequence([validRequest(), validRequest({ nonce: 'n-2' })]);
		const result = await inspect('openid4vp://?request_uri=https%3A%2F%2Fv.test%2Freq', fetchImpl);

		const byId = outcomeById(result);
		expect(byId.get(IDS.requestEndpoint)).toMatchObject({ status: 'pass', source: 'automated' });
		expect(byId.get(IDS.requestMatchable)?.status).toBe('pass');
		expect(byId.get(IDS.requestDiVpFormat)?.status).toBe('pass');
		expect(byId.get(IDS.requestTls)?.status).toBe('pass');
		expect(byId.get(IDS.responseTls)?.status).toBe('pass');
		expect(calls()).toBe(2);
		expect(result.form).toBe('by-reference');
		expect(result.resolvedRequest?.client_id).toBe('https://v.test');
		expect(result.activity.length).toBeGreaterThanOrEqual(7);
	});

	it('warns on the endpoint row when the second fetch repeats the nonce', async () => {
		const { fetchImpl } = fetchSequence([validRequest(), validRequest()]);
		const result = await inspect('https://v.test/req', fetchImpl);
		expect(outcomeById(result).get(IDS.requestEndpoint)).toMatchObject({
			status: 'warn',
			message: expect.stringContaining('same nonce twice')
		});
	});

	it('marks request TLS n/a and skips nonce freshness for an inline request', async () => {
		const neverFetch = (async () => {
			throw new Error('should not fetch');
		}) as typeof fetch;
		const result = await inspect(JSON.stringify(validRequest()), neverFetch);

		const byId = outcomeById(result);
		expect(byId.get(IDS.requestEndpoint)?.status).toBe('pass');
		expect(byId.get(IDS.requestTls)).toMatchObject({
			status: 'n/a',
			message: expect.stringContaining('inline')
		});
		expect(byId.get(IDS.responseTls)?.status).toBe('pass');
		const nonceNote = result.activity.find((a) => a.id === 'oid4-inspect.nonce-freshness');
		expect(nonceNote).toMatchObject({ status: 'info' });
		expect(result.form).toBe('inline');
	});

	it('fails only the endpoint row on unparseable input (no cascading fails)', async () => {
		const { fetchImpl } = fetchSequence([validRequest()]);
		const result = await inspect('not a request at all', fetchImpl);

		const byId = outcomeById(result);
		expect(byId.get(IDS.requestEndpoint)?.status).toBe('fail');
		for (const id of [
			IDS.requestMatchable,
			IDS.requestDiVpFormat,
			IDS.requestTls,
			IDS.responseTls
		]) {
			expect(byId.get(id)?.status).toBe('n/a');
		}
		expect(result.resolvedRequest).toBeUndefined();
	});

	it('fails the endpoint row when the request_uri fetch fails', async () => {
		const fetchImpl = (async () => new Response('nope', { status: 404 })) as typeof fetch;
		const result = await inspect('https://v.test/req', fetchImpl);
		expect(outcomeById(result).get(IDS.requestEndpoint)).toMatchObject({
			status: 'fail',
			message: expect.stringContaining('404')
		});
		expect(outcomeById(result).get(IDS.responseTls)?.status).toBe('n/a');
	});

	it('fails the endpoint row when the resolved request has the wrong shape', async () => {
		const { fetchImpl } = fetchSequence([validRequest({ nonce: undefined })]);
		const result = await inspect('https://v.test/req', fetchImpl);
		expect(outcomeById(result).get(IDS.requestEndpoint)).toMatchObject({
			status: 'fail',
			message: expect.stringContaining('OID4VP shape')
		});
	});

	it('warns when no VP format is pinned and fails when only JWT formats are accepted', async () => {
		const noFormatPd = { ...OB3_PD, format: undefined };
		const inline = (pd: unknown) => JSON.stringify(validRequest({ presentation_definition: pd }));
		const neverFetch = (async () => {
			throw new Error('no fetch');
		}) as typeof fetch;

		const warned = await inspect(inline(noFormatPd), neverFetch);
		expect(outcomeById(warned).get(IDS.requestDiVpFormat)).toMatchObject({
			status: 'warn',
			message: 'The request does not pin a Data Integrity VP format.'
		});

		const jwtOnly = await inspect(inline({ ...OB3_PD, format: { jwt_vp_json: {} } }), neverFetch);
		expect(outcomeById(jwtOnly).get(IDS.requestDiVpFormat)).toMatchObject({
			status: 'fail',
			message: expect.stringContaining('JWT')
		});
	});

	it('fails the matchable row with the matcher reason when the definition cannot match', async () => {
		const pd = {
			id: 'pd-2',
			input_descriptors: [
				{
					id: 'other',
					constraints: {
						fields: [{ path: ['$.type'], filter: { contains: { const: 'DriversLicense' } } }]
					}
				}
			]
		};
		const neverFetch = (async () => {
			throw new Error('no fetch');
		}) as typeof fetch;
		const result = await inspect(
			JSON.stringify(validRequest({ presentation_definition: pd })),
			neverFetch
		);
		expect(outcomeById(result).get(IDS.requestMatchable)).toMatchObject({
			status: 'fail',
			message: expect.stringContaining('No input descriptor')
		});
	});

	it('fails the TLS rows on http endpoints and pre-1.2 protocols', async () => {
		const httpResponse = validRequest({ response_uri: 'http://v.test/direct-post' });
		const neverFetch = (async () => {
			throw new Error('no fetch');
		}) as typeof fetch;
		const httpResult = await inspect(JSON.stringify(httpResponse), neverFetch);
		expect(outcomeById(httpResult).get(IDS.responseTls)).toMatchObject({
			status: 'fail',
			message: expect.stringContaining('HTTPS')
		});

		const { fetchImpl } = fetchSequence([validRequest(), validRequest({ nonce: 'n-2' })]);
		const oldTls = fakeTlsProbe({
			'https://v.test/req': { ok: true, protocol: 'TLSv1.1', atLeastTls12: false }
		});
		const oldResult = await inspect('https://v.test/req', fetchImpl, oldTls);
		expect(outcomeById(oldResult).get(IDS.requestTls)).toMatchObject({
			status: 'fail',
			message: expect.stringContaining('TLSv1.1')
		});
	});
});

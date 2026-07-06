import { afterEach, describe, expect, it, vi } from 'vitest';

import { makeHttpExchangeFlowTransport, probeTls } from './exchange-flow-transport.js';

// Mock node:tls so probeTls resolves deterministically without a real socket.
vi.mock('node:tls', () => ({
	default: {
		connect: (_opts: unknown, cb: () => void) => {
			const socket = {
				getProtocol: () => 'TLSv1.3',
				setTimeout: () => {},
				on: () => socket,
				end: () => {}
			};
			queueMicrotask(() => cb());
			return socket;
		}
	}
}));

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('probeTls', () => {
	it('reports TLSv1.3 as at-least-1.2 for an https URL', async () => {
		const r = await probeTls('https://issuer.test/interactions/ex-1');
		expect(r.ok).toBe(true);
		expect(r.protocol).toBe('TLSv1.3');
		expect(r.atLeastTls12).toBe(true);
	});

	it('rejects a non-https URL without opening a socket', async () => {
		const r = await probeTls('http://issuer.test/x');
		expect(r.ok).toBe(false);
		expect(r.atLeastTls12).toBe(false);
	});
});

describe('makeHttpExchangeFlowTransport.fetchInteractionUrl', () => {
	it('extracts a nested `protocols.vcapi` URL', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(
				async () =>
					new Response(JSON.stringify({ protocols: { vcapi: 'https://issuer.test/vcapi/ex-1' } }), {
						status: 200
					})
			)
		);
		const t = makeHttpExchangeFlowTransport();
		const r = await t.fetchInteractionUrl('https://issuer.test/interactions/ex-1');
		expect(r.ok).toBe(true);
		expect(r.vcapiUrl).toBe('https://issuer.test/vcapi/ex-1');
		expect(r.tls?.atLeastTls12).toBe(true);
	});

	it('extracts a bare `vcapi` URL and flags a missing one', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(
				async () =>
					new Response(JSON.stringify({ vcapi: 'https://issuer.test/vcapi/ex-2' }), { status: 200 })
			)
		);
		const bare = await makeHttpExchangeFlowTransport().fetchInteractionUrl(
			'https://issuer.test/interactions/ex-2'
		);
		expect(bare.vcapiUrl).toBe('https://issuer.test/vcapi/ex-2');

		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(JSON.stringify({ protocols: {} }), { status: 200 }))
		);
		const missing = await makeHttpExchangeFlowTransport().fetchInteractionUrl(
			'https://issuer.test/interactions/ex-3'
		);
		expect(missing.vcapiUrl).toBeUndefined();
	});

	it('reports a non-2xx status as not-ok', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('nope', { status: 404 }))
		);
		const r = await makeHttpExchangeFlowTransport().fetchInteractionUrl(
			'https://issuer.test/interactions/ex-4'
		);
		expect(r.ok).toBe(false);
		expect(r.status).toBe(404);
	});

	it('rejects a non-absolute URL without fetching', async () => {
		const r = await makeHttpExchangeFlowTransport().fetchInteractionUrl('not-a-url');
		expect(r.ok).toBe(false);
		expect(r.error).toMatch(/absolute/i);
	});
});

describe('makeHttpExchangeFlowTransport.postToVcapi', () => {
	it('returns ok + parsed body on 200', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(
				async () =>
					new Response(JSON.stringify({ verifiablePresentationRequest: { challenge: 'c' } }), {
						status: 200
					})
			)
		);
		const r = await makeHttpExchangeFlowTransport().postToVcapi(
			'https://issuer.test/vcapi/ex-1',
			{}
		);
		expect(r.ok).toBe(true);
		expect(
			(r.rawBody as { verifiablePresentationRequest?: unknown }).verifiablePresentationRequest
		).toBeDefined();
	});

	it('flags a non-2xx response', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('bad', { status: 500 }))
		);
		const r = await makeHttpExchangeFlowTransport().postToVcapi(
			'https://issuer.test/vcapi/ex-1',
			{}
		);
		expect(r.ok).toBe(false);
		expect(r.status).toBe(500);
	});
});

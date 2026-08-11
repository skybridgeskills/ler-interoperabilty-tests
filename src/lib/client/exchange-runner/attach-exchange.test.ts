import { afterEach, describe, expect, it, vi } from 'vitest';

import { attachExchange } from './attach-exchange.js';

function okBody(protocols: Record<string, string>, exchangeId = 'ex-1') {
	return new Response(JSON.stringify({ exchangeId, workflowId: 'claim', protocols }), {
		status: 200,
		headers: { 'content-type': 'application/json' }
	});
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('attachExchange', () => {
	it('GETs the adopt route with the workflow and returns the VCALM interaction URL', async () => {
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(okBody({ iu: 'http://svc.test/interactions/ex-1' }));

		const result = await attachExchange({ exchangeId: 'ex-1', workflow: 'claim', link: 'iu' });

		expect(fetchSpy.mock.calls[0]![0]).toBe('/api/exchange-runner/ex-1/protocols?workflow=claim');
		expect(result).toEqual({
			ok: true,
			exchangeId: 'ex-1',
			interactionUrl: 'http://svc.test/interactions/ex-1'
		});
	});

	it('selects the OID4VCI offer link for the oid4 acceptance profile', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			okBody({
				iu: 'http://svc.test/interactions/ex-1',
				OID4VCI: 'openid-credential-offer://?credential_offer_uri=x'
			})
		);

		const result = await attachExchange({
			exchangeId: 'ex-1',
			workflow: 'claim',
			link: 'OID4VCI'
		});

		expect(result).toMatchObject({
			ok: true,
			interactionUrl: 'openid-credential-offer://?credential_offer_uri=x'
		});
	});

	it('selects the OID4VP request link for the oid4 presentation profile', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			okBody({
				iu: 'http://svc.test/interactions/ex-1',
				OID4VP: 'openid4vp://?client_id=x&request_uri=y'
			})
		);

		const result = await attachExchange({
			exchangeId: 'ex-1',
			workflow: 'verify',
			link: 'OID4VP'
		});

		expect(result).toMatchObject({
			ok: true,
			interactionUrl: 'openid4vp://?client_id=x&request_uri=y'
		});
	});

	it('percent-encodes the exchange id into the path', async () => {
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(okBody({ iu: 'http://svc.test/interactions/a' }));

		await attachExchange({ exchangeId: 'probe/1 2', workflow: 'verify', link: 'iu' });

		expect(fetchSpy.mock.calls[0]![0]).toBe(
			'/api/exchange-runner/probe%2F1%202/protocols?workflow=verify'
		);
	});

	it('reports the requested link being absent rather than attaching without a QR', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			okBody({ iu: 'http://svc.test/interactions/ex-1' })
		);

		const result = await attachExchange({
			exchangeId: 'ex-1',
			workflow: 'verify',
			link: 'OID4VP'
		});

		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.message).toContain('did not return an OID4VP request');
	});

	it('passes the server error affordance straight through on a non-2xx', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(
				JSON.stringify({ code: 503, message: 'Exchange runner disabled', hint: 'Set the flag' }),
				{ status: 503, headers: { 'content-type': 'application/json' } }
			)
		);

		const result = await attachExchange({ exchangeId: 'ex-1', workflow: 'claim', link: 'iu' });

		expect(result).toEqual({
			ok: false,
			error: { message: 'Exchange runner disabled', hint: 'Set the flag' }
		});
	});

	it('falls back to a status-shaped message when the error body has no copy', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('boom', { status: 500 }));

		const result = await attachExchange({ exchangeId: 'ex-1', workflow: 'claim', link: 'iu' });

		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error.message).toBe('Attach responded 500');
		expect(result.error.hint).toContain('dev:full');
	});

	it('turns a network failure into the same error affordance', async () => {
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('connection refused'));

		const result = await attachExchange({ exchangeId: 'ex-1', workflow: 'claim', link: 'iu' });

		expect(result).toEqual({
			ok: false,
			error: {
				message: 'connection refused',
				hint: 'Run `pnpm turbo dev:full` to start the local DCC dependency services.'
			}
		});
	});
});

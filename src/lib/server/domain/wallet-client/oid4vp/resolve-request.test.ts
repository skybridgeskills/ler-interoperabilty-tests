import { describe, expect, it } from 'vitest';

import { resolveAuthorizationRequest } from './resolve-request.js';

const jsonResponse = (body: string) =>
	new Response(body, { status: 200, headers: { 'content-type': 'application/json' } });

describe('resolveAuthorizationRequest', () => {
	it('returns an inline request as-is without fetching', async () => {
		const request = { client_id: 'x' };
		const result = await resolveAuthorizationRequest({ request }, () => {
			throw new Error('should not fetch');
		});
		expect(result).toBe(request);
	});

	it('fetches and parses a JSON request object from request_uri', async () => {
		const fetchImpl = (async () => jsonResponse('{"client_id":"https://v.test"}')) as typeof fetch;
		const result = await resolveAuthorizationRequest(
			{ requestUri: 'https://v.test/req' },
			fetchImpl
		);
		expect(result).toEqual({ client_id: 'https://v.test' });
	});

	it('decodes a JWT (signed request object) payload from request_uri', async () => {
		const payload = Buffer.from(JSON.stringify({ client_id: 'https://v.test' })).toString(
			'base64url'
		);
		const jwt = `eyJhbGciOiJFUzI1NiJ9.${payload}.sig`;
		const fetchImpl = (async () =>
			new Response(jwt, {
				status: 200,
				headers: { 'content-type': 'application/jwt' }
			})) as typeof fetch;
		const result = await resolveAuthorizationRequest(
			{ requestUri: 'https://v.test/req.jwt' },
			fetchImpl
		);
		expect(result).toEqual({ client_id: 'https://v.test' });
	});

	it('throws when neither request nor requestUri is provided', async () => {
		await expect(resolveAuthorizationRequest({})).rejects.toThrow(/request/);
	});

	it('throws when the request_uri fetch fails', async () => {
		const fetchImpl = (async () => new Response('nope', { status: 404 })) as typeof fetch;
		await expect(
			resolveAuthorizationRequest({ requestUri: 'https://v.test/req' }, fetchImpl)
		).rejects.toThrow(/404/);
	});
});

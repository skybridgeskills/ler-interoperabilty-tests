import { afterEach, describe, expect, it, vi } from 'vitest';

import { ExchangeRunnerConfig } from './exchange-runner-config.js';
import { RealTransactionServiceClient } from './transaction-service-client.js';

const baseConfig = ExchangeRunnerConfig({
	enabled: true,
	transactionServiceUrl: 'http://lits.test:4004',
	tenantName: 'default',
	tenantToken: 'shh',
	exchangeHost: 'http://lits.test:4004'
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('RealTransactionServiceClient', () => {
	it('createExchange POSTs the right URL with auth + body and parses the response', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(
				JSON.stringify({
					iu: 'http://lits.test:4004/interactions/abc-123',
					vcapi: 'http://lits.test:4004/workflows/claim/exchanges/abc-123',
					lcw: 'http://lits.test:4004/lcw',
					verifiablePresentationRequest: { query: { type: 'DIDAuthentication' } }
				}),
				{ status: 200, headers: { 'content-type': 'application/json' } }
			)
		);

		const client = RealTransactionServiceClient(baseConfig);
		const result = await client.createExchange({ retrievalId: 'r-1' });

		expect(result.exchangeId).toBe('abc-123');
		expect(fetchSpy).toHaveBeenCalledOnce();
		const [url, init] = fetchSpy.mock.calls[0]!;
		expect(url).toBe('http://lits.test:4004/workflows/claim/exchanges');
		const headers = init?.headers as Record<string, string>;
		expect(headers.Authorization).toBe('Bearer shh');
		expect(headers['Content-Type']).toBe('application/json');
		const body = JSON.parse(init!.body as string);
		expect(body.variables.tenantName).toBe('default');
		expect(body.variables.retrievalId).toBe('r-1');
		expect(typeof body.variables.vc).toBe('string');
	});

	it('createExchange surfaces non-2xx as TransactionServiceError', async () => {
		vi.spyOn(globalThis, 'fetch').mockImplementation(
			async () => new Response('nope', { status: 401 })
		);
		const client = RealTransactionServiceClient(baseConfig);
		await expect(client.createExchange({ retrievalId: 'x' })).rejects.toMatchObject({
			status: 401,
			name: 'TransactionServiceError'
		});
	});

	it('getExchange parses the record and validates the state enum', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify({ exchangeId: 'abc', state: 'active', variables: { foo: 1 } }), {
				status: 200,
				headers: { 'content-type': 'application/json' }
			})
		);
		const client = RealTransactionServiceClient(baseConfig);
		const record = await client.getExchange('abc');
		expect(record).toEqual({ exchangeId: 'abc', state: 'active', variables: { foo: 1 } });
	});

	it('preserves the `OID4VCI` field when the service returns it', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(
				JSON.stringify({
					iu: 'http://lits.test:4004/interactions/abc-123',
					vcapi: 'http://lits.test:4004/workflows/claim/exchanges/abc-123',
					lcw: 'http://lits.test:4004/lcw',
					OID4VCI:
						'openid-credential-offer://?credential_offer_uri=http%3A%2F%2Flits.test%3A4004%2Fworkflows%2Fclaim%2Fexchanges%2Fabc-123%2Fopenid%2Fcredential-offer',
					verifiablePresentationRequest: { query: { type: 'DIDAuthentication' } }
				}),
				{ status: 200, headers: { 'content-type': 'application/json' } }
			)
		);
		const client = RealTransactionServiceClient(baseConfig);
		const result = await client.createExchange({ retrievalId: 'r-1' });
		expect(result.protocols.OID4VCI).toBe(
			'openid-credential-offer://?credential_offer_uri=http%3A%2F%2Flits.test%3A4004%2Fworkflows%2Fclaim%2Fexchanges%2Fabc-123%2Fopenid%2Fcredential-offer'
		);
	});

	it('leaves `OID4VCI` undefined when the service omits it (legacy container)', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(
				JSON.stringify({
					iu: 'http://lits.test:4004/interactions/abc-123',
					vcapi: 'http://lits.test:4004/workflows/claim/exchanges/abc-123',
					lcw: 'http://lits.test:4004/lcw',
					verifiablePresentationRequest: { query: { type: 'DIDAuthentication' } }
				}),
				{ status: 200, headers: { 'content-type': 'application/json' } }
			)
		);
		const client = RealTransactionServiceClient(baseConfig);
		const result = await client.createExchange({ retrievalId: 'r-1' });
		expect(result.protocols.OID4VCI).toBeUndefined();
	});
});

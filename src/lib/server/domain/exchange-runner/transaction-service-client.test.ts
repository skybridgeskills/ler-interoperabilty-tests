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

function okProtocols(overrides: Record<string, unknown> = {}) {
	return new Response(
		JSON.stringify({
			iu: 'http://lits.test:4004/interactions/abc-123',
			vcapi: 'http://lits.test:4004/workflows/claim/exchanges/abc-123',
			lcw: 'http://lits.test:4004/lcw',
			verifiablePresentationRequest: { query: { type: 'DIDAuthentication' } },
			...overrides
		}),
		{ status: 200, headers: { 'content-type': 'application/json' } }
	);
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('RealTransactionServiceClient', () => {
	it('createIssuanceExchange POSTs the claim URL with auth + body and returns workflowId claim', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okProtocols());

		const client = RealTransactionServiceClient(baseConfig);
		const result = await client.createIssuanceExchange({ retrievalId: 'r-1' });

		expect(result.exchangeId).toBe('abc-123');
		expect(result.workflowId).toBe('claim');
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

	it('createVerificationExchange POSTs the verify URL with the presentation-request body', async () => {
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(
				okProtocols({ vcapi: 'http://lits.test:4004/workflows/verify/exchanges/abc-123' })
			);

		const client = RealTransactionServiceClient(baseConfig);
		const result = await client.createVerificationExchange({
			vprCredentialType: ['OpenBadgeCredential'],
			vprContext: ['https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json']
		});

		expect(result.workflowId).toBe('verify');
		const [url, init] = fetchSpy.mock.calls[0]!;
		expect(url).toBe('http://lits.test:4004/workflows/verify/exchanges');
		const body = JSON.parse(init!.body as string);
		expect(body.variables.tenantName).toBe('default');
		expect(body.variables.exchangeHost).toBe('http://lits.test:4004');
		expect(body.variables.vprCredentialType).toEqual(['OpenBadgeCredential']);
		expect(body.variables.vprContext).toEqual([
			'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json'
		]);
		// challenge is server-generated — the suite must not send one
		expect(body.variables.challenge).toBeUndefined();
		// trustedIssuers is genuinely optional — omitted when not provided
		expect(body.variables.trustedIssuers).toBeUndefined();
		// vprClaims is a REQUIRED array in exchangeCreateSchemaVerify — always sent,
		// defaulting to [] when the caller provides none.
		expect(body.variables.vprClaims).toEqual([]);
	});

	it('createVerificationExchange forwards optional trustedIssuers / vprClaims when present', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okProtocols());
		const client = RealTransactionServiceClient(baseConfig);
		await client.createVerificationExchange({
			vprCredentialType: ['OpenBadgeCredential'],
			vprContext: ['ctx'],
			trustedIssuers: ['did:key:zIssuer'],
			vprClaims: [{ path: ['credentialSubject', 'id'] }]
		});
		const body = JSON.parse(fetchSpy.mock.calls[0]![1]!.body as string);
		expect(body.variables.trustedIssuers).toEqual(['did:key:zIssuer']);
		expect(body.variables.vprClaims).toEqual([{ path: ['credentialSubject', 'id'] }]);
	});

	it('createIssuanceExchange surfaces non-2xx as TransactionServiceError', async () => {
		vi.spyOn(globalThis, 'fetch').mockImplementation(
			async () => new Response('nope', { status: 401 })
		);
		const client = RealTransactionServiceClient(baseConfig);
		await expect(client.createIssuanceExchange({ retrievalId: 'x' })).rejects.toMatchObject({
			status: 401,
			name: 'TransactionServiceError'
		});
	});

	it('getExchange builds the URL from the workflowId and validates the state enum', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify({ exchangeId: 'abc', state: 'active', variables: { foo: 1 } }), {
				status: 200,
				headers: { 'content-type': 'application/json' }
			})
		);
		const client = RealTransactionServiceClient(baseConfig);
		const record = await client.getExchange('verify', 'abc');
		expect(fetchSpy.mock.calls[0]![0]).toBe('http://lits.test:4004/workflows/verify/exchanges/abc');
		expect(record).toEqual({ exchangeId: 'abc', state: 'active', variables: { foo: 1 } });
	});

	it('preserves the `OID4VCI` field when the service returns it', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			okProtocols({
				OID4VCI:
					'openid-credential-offer://?credential_offer_uri=http%3A%2F%2Flits.test%3A4004%2Fworkflows%2Fclaim%2Fexchanges%2Fabc-123%2Fopenid%2Fcredential-offer'
			})
		);
		const client = RealTransactionServiceClient(baseConfig);
		const result = await client.createIssuanceExchange({ retrievalId: 'r-1' });
		expect(result.protocols.OID4VCI).toBe(
			'openid-credential-offer://?credential_offer_uri=http%3A%2F%2Flits.test%3A4004%2Fworkflows%2Fclaim%2Fexchanges%2Fabc-123%2Fopenid%2Fcredential-offer'
		);
	});

	it('leaves `OID4VCI` undefined when the service omits it (legacy container)', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(okProtocols());
		const client = RealTransactionServiceClient(baseConfig);
		const result = await client.createIssuanceExchange({ retrievalId: 'r-1' });
		expect(result.protocols.OID4VCI).toBeUndefined();
	});
});

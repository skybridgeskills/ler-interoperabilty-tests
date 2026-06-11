import { describe, expect, it } from 'vitest';

import { FakeTransactionServiceClient } from './fake-transaction-service-client.js';
import { TransactionServiceError } from './transaction-service-client.js';

describe('FakeTransactionServiceClient', () => {
	it('createExchange returns URL-shaped iu, unique exchangeId, pending state', async () => {
		const client = FakeTransactionServiceClient();
		const a = await client.createExchange({ retrievalId: 'a' });
		const b = await client.createExchange({ retrievalId: 'b' });

		expect(a.exchangeId).not.toBe(b.exchangeId);
		expect(a.protocols.iu).toMatch(/^https?:\/\/.+\/interactions\/.+/);
		expect(a.protocols.vcapi).toMatch(/^https?:\/\/.+\/workflows\/claim\/exchanges\/.+/);

		const stored = client.getStored(a.exchangeId);
		expect(stored?.state).toBe('pending');
		expect(stored?.variables).toEqual({ retrievalId: 'a' });
	});

	it('createExchange returns an OID4VCI deep link referencing the credential-offer URI', async () => {
		const client = FakeTransactionServiceClient();
		const { exchangeId, protocols } = await client.createExchange({ retrievalId: 'x' });
		expect(protocols.OID4VCI).toMatch(/^openid-credential-offer:\/\/\?credential_offer_uri=/);
		expect(protocols.OID4VCI).toContain(
			encodeURIComponent(`/workflows/claim/exchanges/${exchangeId}/openid/credential-offer`)
		);
	});

	it('respects custom host on the iu / vcapi / OID4VCI URLs', async () => {
		const client = FakeTransactionServiceClient({ host: 'https://demo.test' });
		const { protocols } = await client.createExchange({ retrievalId: 'x' });
		expect(protocols.iu.startsWith('https://demo.test/')).toBe(true);
		expect(protocols.vcapi.startsWith('https://demo.test/')).toBe(true);
		expect(protocols.OID4VCI).toContain(encodeURIComponent('https://demo.test/'));
	});

	it('advanceToActive / Complete / Invalid mutate state and merge variables', async () => {
		const client = FakeTransactionServiceClient();
		const { exchangeId } = await client.createExchange({ retrievalId: 'x' });

		client.advanceToActive(exchangeId, { didAuthHolderDid: 'did:key:zABC' });
		expect((await client.getExchange(exchangeId)).state).toBe('active');
		expect((await client.getExchange(exchangeId)).variables?.didAuthHolderDid).toBe('did:key:zABC');

		client.advanceToComplete(exchangeId, { signedVc: { id: 'urn:uuid:abc' } });
		expect((await client.getExchange(exchangeId)).state).toBe('complete');
		expect((await client.getExchange(exchangeId)).variables?.signedVc).toEqual({
			id: 'urn:uuid:abc'
		});
		// previous variables persist
		expect((await client.getExchange(exchangeId)).variables?.didAuthHolderDid).toBe('did:key:zABC');

		const other = (await client.createExchange({ retrievalId: 'y' })).exchangeId;
		client.advanceToInvalid(other, 'expired');
		expect((await client.getExchange(other)).state).toBe('invalid');
		expect((await client.getExchange(other)).variables?.invalidReason).toBe('expired');
	});

	it('getExchange throws 404 for unknown ids', async () => {
		const client = FakeTransactionServiceClient();
		await expect(client.getExchange('does-not-exist')).rejects.toBeInstanceOf(
			TransactionServiceError
		);
		await expect(client.getExchange('does-not-exist')).rejects.toMatchObject({ status: 404 });
	});

	it('clear() empties the store; listExchanges() reflects what is there', async () => {
		const client = FakeTransactionServiceClient();
		await client.createExchange({ retrievalId: 'a' });
		await client.createExchange({ retrievalId: 'b' });
		expect(client.listExchanges()).toHaveLength(2);
		client.clear();
		expect(client.listExchanges()).toEqual([]);
	});

	it('returned records are clones — mutating callers does not affect storage', async () => {
		const client = FakeTransactionServiceClient();
		const { exchangeId } = await client.createExchange({ retrievalId: 'x' });
		const record = await client.getExchange(exchangeId);
		(record.variables as Record<string, unknown>).leak = 'should-not-stick';
		const re = await client.getExchange(exchangeId);
		expect(re.variables?.leak).toBeUndefined();
	});

	describe('OID4VCI advance hooks', () => {
		const oid4vciOf = (record: { variables?: Record<string, unknown> }) =>
			record.variables?.oid4vci as Record<string, unknown> | undefined;

		it('advanceOid4vciOfferFetched stamps preAuthorizedCode, state stays pending', async () => {
			const client = FakeTransactionServiceClient();
			const { exchangeId } = await client.createExchange({ retrievalId: 'x' });
			client.advanceOid4vciOfferFetched(exchangeId);
			const ex = await client.getExchange(exchangeId);
			expect(ex.state).toBe('pending');
			expect(oid4vciOf(ex)?.preAuthorizedCode).toEqual(expect.stringMatching(/^fake-preauth-/));
		});

		it('advanceOid4vciTokenIssued sets codeUsed + accessToken, persists prior fields, still pending', async () => {
			const client = FakeTransactionServiceClient();
			const { exchangeId } = await client.createExchange({ retrievalId: 'x' });
			client.advanceOid4vciOfferFetched(exchangeId);
			client.advanceOid4vciTokenIssued(exchangeId);
			const ex = await client.getExchange(exchangeId);
			expect(ex.state).toBe('pending');
			expect(oid4vciOf(ex)?.codeUsed).toBe(true);
			expect(oid4vciOf(ex)?.accessToken).toEqual(expect.stringMatching(/^fake-access-/));
			// prior field persists
			expect(oid4vciOf(ex)?.preAuthorizedCode).toEqual(expect.stringMatching(/^fake-preauth-/));
		});

		it('advanceOid4vciNonceIssued sets cNonce', async () => {
			const client = FakeTransactionServiceClient();
			const { exchangeId } = await client.createExchange({ retrievalId: 'x' });
			client.advanceOid4vciOfferFetched(exchangeId);
			client.advanceOid4vciTokenIssued(exchangeId);
			client.advanceOid4vciNonceIssued(exchangeId);
			const ex = await client.getExchange(exchangeId);
			expect(ex.state).toBe('pending');
			expect(oid4vciOf(ex)?.cNonce).toEqual(expect.stringMatching(/^fake-cnonce-/));
		});

		it('advanceOid4vciComplete flips to complete, merges vars, persists prior oid4vci fields', async () => {
			const client = FakeTransactionServiceClient();
			const { exchangeId } = await client.createExchange({ retrievalId: 'x' });
			client.advanceOid4vciOfferFetched(exchangeId);
			client.advanceOid4vciTokenIssued(exchangeId);
			client.advanceOid4vciNonceIssued(exchangeId);
			client.advanceOid4vciComplete(exchangeId, { signedVc: { id: 'urn:uuid:vc' } });
			const ex = await client.getExchange(exchangeId);
			expect(ex.state).toBe('complete');
			expect(ex.variables?.signedVc).toEqual({ id: 'urn:uuid:vc' });
			expect(oid4vciOf(ex)?.nonceUsed).toBe(true);
			expect(oid4vciOf(ex)?.cNonce).toEqual(expect.stringMatching(/^fake-cnonce-/));
			expect(oid4vciOf(ex)?.accessToken).toEqual(expect.stringMatching(/^fake-access-/));
		});

		it('returned oid4vci records remain clones', async () => {
			const client = FakeTransactionServiceClient();
			const { exchangeId } = await client.createExchange({ retrievalId: 'x' });
			client.advanceOid4vciOfferFetched(exchangeId);
			const ex = await client.getExchange(exchangeId);
			(ex.variables?.oid4vci as Record<string, unknown>).leak = 'nope';
			const re = await client.getExchange(exchangeId);
			expect((re.variables?.oid4vci as Record<string, unknown>).leak).toBeUndefined();
		});
	});
});

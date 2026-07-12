import { describe, expect, it } from 'vitest';

import { FakeTransactionServiceClient } from './fake-transaction-service-client.js';
import { TransactionServiceError } from './transaction-service-client.js';

describe('FakeTransactionServiceClient', () => {
	it('createIssuanceExchange returns URL-shaped iu, unique exchangeId, pending state, claim workflow', async () => {
		const client = FakeTransactionServiceClient();
		const a = await client.createIssuanceExchange({ retrievalId: 'a' });
		const b = await client.createIssuanceExchange({ retrievalId: 'b' });

		expect(a.exchangeId).not.toBe(b.exchangeId);
		expect(a.workflowId).toBe('claim');
		expect(a.protocols.iu).toMatch(/^https?:\/\/.+\/interactions\/.+/);
		expect(a.protocols.vcapi).toMatch(/^https?:\/\/.+\/workflows\/claim\/exchanges\/.+/);

		const stored = client.getStored(a.exchangeId);
		expect(stored?.state).toBe('pending');
		expect(stored?.variables).toEqual({ retrievalId: 'a' });
	});

	it('createIssuanceExchange returns an OID4VCI deep link referencing the credential-offer URI', async () => {
		const client = FakeTransactionServiceClient();
		const { exchangeId, protocols } = await client.createIssuanceExchange({ retrievalId: 'x' });
		expect(protocols.OID4VCI).toMatch(/^openid-credential-offer:\/\/\?credential_offer_uri=/);
		expect(protocols.OID4VCI).toContain(
			encodeURIComponent(`/workflows/claim/exchanges/${exchangeId}/openid/credential-offer`)
		);
	});

	it('respects custom host on the iu / vcapi / OID4VCI URLs', async () => {
		const client = FakeTransactionServiceClient({ host: 'https://demo.test' });
		const { protocols } = await client.createIssuanceExchange({ retrievalId: 'x' });
		expect(protocols.iu.startsWith('https://demo.test/')).toBe(true);
		expect(protocols.vcapi.startsWith('https://demo.test/')).toBe(true);
		expect(protocols.OID4VCI).toContain(encodeURIComponent('https://demo.test/'));
	});

	it('advanceToActive / Complete / Invalid mutate state and merge variables', async () => {
		const client = FakeTransactionServiceClient();
		const { exchangeId } = await client.createIssuanceExchange({ retrievalId: 'x' });

		client.advanceToActive(exchangeId, { didAuthHolderDid: 'did:key:zABC' });
		expect((await client.getExchange('claim', exchangeId)).state).toBe('active');
		expect((await client.getExchange('claim', exchangeId)).variables?.didAuthHolderDid).toBe(
			'did:key:zABC'
		);

		client.advanceToComplete(exchangeId, { signedVc: { id: 'urn:uuid:abc' } });
		expect((await client.getExchange('claim', exchangeId)).state).toBe('complete');
		expect((await client.getExchange('claim', exchangeId)).variables?.signedVc).toEqual({
			id: 'urn:uuid:abc'
		});
		// previous variables persist
		expect((await client.getExchange('claim', exchangeId)).variables?.didAuthHolderDid).toBe(
			'did:key:zABC'
		);

		const other = (await client.createIssuanceExchange({ retrievalId: 'y' })).exchangeId;
		client.advanceToInvalid(other, 'expired');
		expect((await client.getExchange('claim', other)).state).toBe('invalid');
		expect((await client.getExchange('claim', other)).variables?.invalidReason).toBe('expired');
	});

	it('getExchange throws 404 for unknown ids', async () => {
		const client = FakeTransactionServiceClient();
		await expect(client.getExchange('claim', 'does-not-exist')).rejects.toBeInstanceOf(
			TransactionServiceError
		);
		await expect(client.getExchange('claim', 'does-not-exist')).rejects.toMatchObject({
			status: 404
		});
	});

	it('clear() empties the store; listExchanges() reflects what is there', async () => {
		const client = FakeTransactionServiceClient();
		await client.createIssuanceExchange({ retrievalId: 'a' });
		await client.createIssuanceExchange({ retrievalId: 'b' });
		expect(client.listExchanges()).toHaveLength(2);
		client.clear();
		expect(client.listExchanges()).toEqual([]);
	});

	it('returned records are clones — mutating callers does not affect storage', async () => {
		const client = FakeTransactionServiceClient();
		const { exchangeId } = await client.createIssuanceExchange({ retrievalId: 'x' });
		const record = await client.getExchange('claim', exchangeId);
		(record.variables as Record<string, unknown>).leak = 'should-not-stick';
		const re = await client.getExchange('claim', exchangeId);
		expect(re.variables?.leak).toBeUndefined();
	});

	describe('verify lifecycle', () => {
		it('createVerificationExchange stores a pending verify exchange with QueryByExample + DIDAuth VPR', async () => {
			const client = FakeTransactionServiceClient();
			const { exchangeId, workflowId, protocols } = await client.createVerificationExchange({
				vprCredentialType: ['OpenBadgeCredential'],
				vprContext: ['https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json']
			});

			expect(workflowId).toBe('verify');
			expect(protocols.vcapi).toMatch(/\/workflows\/verify\/exchanges\/.+/);
			// verify uses a presentation request, never an OID4VCI issuance offer
			expect(protocols.OID4VCI).toBeUndefined();
			const vpr = protocols.verifiablePresentationRequest as {
				query: Array<{ type: string; credentialQuery?: { example: { type: string[] } } }>;
			};
			expect(vpr.query.map((q) => q.type)).toEqual(['QueryByExample', 'DIDAuthentication']);
			expect(vpr.query[0]!.credentialQuery?.example.type).toEqual(['OpenBadgeCredential']);

			const stored = client.getStored(exchangeId);
			expect(stored?.workflowId).toBe('verify');
			expect(stored?.state).toBe('pending');
			expect(stored?.variables?.vprCredentialType).toEqual(['OpenBadgeCredential']);
		});

		it('walks pending → active (+ verifyTask) → complete with a populated results.default', async () => {
			const client = FakeTransactionServiceClient();
			const { exchangeId } = await client.createVerificationExchange({
				vprCredentialType: ['OpenBadgeCredential'],
				vprContext: ['ctx']
			});

			// Sync pass: two-phase window — active with a queued OB verifyTask.
			client.advanceVerifyToActive(exchangeId);
			const active = await client.getExchange('verify', exchangeId);
			expect(active.state).toBe('active');
			const task = active.variables?.verifyTask as Record<string, unknown>;
			expect(task.status).toBe('queued');
			expect(task.openBadgesCredentialIndices).toEqual([0]);
			// no results yet while the async pass is pending
			expect(active.variables?.results).toBeUndefined();

			// Async pass settles: complete with a populated results.default.
			client.advanceVerifyToComplete(exchangeId);
			const complete = await client.getExchange('verify', exchangeId);
			expect(complete.state).toBe('complete');
			const results = complete.variables?.results as { default: Record<string, unknown> };
			expect(results.default.verified).toBe(true);
			expect(results.default.verifiablePresentation).toBeDefined();
			expect(Array.isArray(results.default.summary)).toBe(true);
			expect((results.default.summary as unknown[]).length).toBeGreaterThan(0);
			// the verifyTask is marked succeeded once the async pass settles
			expect((complete.variables?.verifyTask as Record<string, unknown>).status).toBe('succeeded');
		});

		it('advanceVerifyToComplete with { verified: false } yields an invalid results.default', async () => {
			const client = FakeTransactionServiceClient();
			const { exchangeId } = await client.createVerificationExchange({
				vprCredentialType: ['OpenBadgeCredential'],
				vprContext: ['ctx']
			});
			client.advanceVerifyToActive(exchangeId);
			client.advanceVerifyToComplete(exchangeId, { verified: false });
			const ex = await client.getExchange('verify', exchangeId);
			expect(ex.state).toBe('invalid');
			const results = ex.variables?.results as { default: Record<string, unknown> };
			expect(results.default.verified).toBe(false);
			expect((results.default.summary as unknown[]).length).toBeGreaterThan(0);
		});
	});

	describe('OID4VCI advance hooks', () => {
		const oid4vciOf = (record: { variables?: Record<string, unknown> }) =>
			record.variables?.oid4vci as Record<string, unknown> | undefined;

		it('advanceOid4vciOfferFetched stamps preAuthorizedCode, state stays pending', async () => {
			const client = FakeTransactionServiceClient();
			const { exchangeId } = await client.createIssuanceExchange({ retrievalId: 'x' });
			client.advanceOid4vciOfferFetched(exchangeId);
			const ex = await client.getExchange('claim', exchangeId);
			expect(ex.state).toBe('pending');
			expect(oid4vciOf(ex)?.preAuthorizedCode).toEqual(expect.stringMatching(/^fake-preauth-/));
		});

		it('advanceOid4vciTokenIssued sets codeUsed + accessToken, persists prior fields, still pending', async () => {
			const client = FakeTransactionServiceClient();
			const { exchangeId } = await client.createIssuanceExchange({ retrievalId: 'x' });
			client.advanceOid4vciOfferFetched(exchangeId);
			client.advanceOid4vciTokenIssued(exchangeId);
			const ex = await client.getExchange('claim', exchangeId);
			expect(ex.state).toBe('pending');
			expect(oid4vciOf(ex)?.codeUsed).toBe(true);
			expect(oid4vciOf(ex)?.accessToken).toEqual(expect.stringMatching(/^fake-access-/));
			// prior field persists
			expect(oid4vciOf(ex)?.preAuthorizedCode).toEqual(expect.stringMatching(/^fake-preauth-/));
		});

		it('advanceOid4vciNonceIssued sets cNonce', async () => {
			const client = FakeTransactionServiceClient();
			const { exchangeId } = await client.createIssuanceExchange({ retrievalId: 'x' });
			client.advanceOid4vciOfferFetched(exchangeId);
			client.advanceOid4vciTokenIssued(exchangeId);
			client.advanceOid4vciNonceIssued(exchangeId);
			const ex = await client.getExchange('claim', exchangeId);
			expect(ex.state).toBe('pending');
			expect(oid4vciOf(ex)?.cNonce).toEqual(expect.stringMatching(/^fake-cnonce-/));
		});

		it('advanceOid4vciComplete flips to complete, merges vars, persists prior oid4vci fields', async () => {
			const client = FakeTransactionServiceClient();
			const { exchangeId } = await client.createIssuanceExchange({ retrievalId: 'x' });
			client.advanceOid4vciOfferFetched(exchangeId);
			client.advanceOid4vciTokenIssued(exchangeId);
			client.advanceOid4vciNonceIssued(exchangeId);
			client.advanceOid4vciComplete(exchangeId, { signedVc: { id: 'urn:uuid:vc' } });
			const ex = await client.getExchange('claim', exchangeId);
			expect(ex.state).toBe('complete');
			expect(ex.variables?.signedVc).toEqual({ id: 'urn:uuid:vc' });
			expect(oid4vciOf(ex)?.nonceUsed).toBe(true);
			expect(oid4vciOf(ex)?.cNonce).toEqual(expect.stringMatching(/^fake-cnonce-/));
			expect(oid4vciOf(ex)?.accessToken).toEqual(expect.stringMatching(/^fake-access-/));
		});

		it('returned oid4vci records remain clones', async () => {
			const client = FakeTransactionServiceClient();
			const { exchangeId } = await client.createIssuanceExchange({ retrievalId: 'x' });
			client.advanceOid4vciOfferFetched(exchangeId);
			const ex = await client.getExchange('claim', exchangeId);
			(ex.variables?.oid4vci as Record<string, unknown>).leak = 'nope';
			const re = await client.getExchange('claim', exchangeId);
			expect((re.variables?.oid4vci as Record<string, unknown>).leak).toBeUndefined();
		});
	});
});

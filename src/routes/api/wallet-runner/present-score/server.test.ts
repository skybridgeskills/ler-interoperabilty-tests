import { describe, expect, it } from 'vitest';

import { buildAppContext } from '$lib/server/build-app-context.js';
import { asFakeTransactionServiceClient } from '$lib/server/domain/exchange-runner/index.js';
import { transactionServiceClient } from '$lib/server/domain/exchange-runner/provide-transaction-service-client.js';
import { suiteVerifyDefaults } from '$lib/server/domain/exchange-runner/verify-defaults.js';
import { WalletCrypto } from '$lib/server/domain/wallet-crypto/index.js';
import { runInContext } from '$lib/server/util/provider/provider-ctx.js';

import { POST } from './+server.js';

type Payload = {
	settled: boolean;
	state: string;
	report?: { verified: boolean };
	failingMustCount?: number;
	message?: string;
};

async function withCtx<T>(fn: () => Promise<T>): Promise<T> {
	const ctx = await buildAppContext({ CONTEXT: 'test' });
	return runInContext(ctx, fn);
}

async function callPost(body: unknown): Promise<{ status: number; payload: Payload }> {
	const request = new Request('http://localhost/api/wallet-runner/present-score', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
	const response = await POST({ request });
	return { status: response.status, payload: (await response.json()) as Payload };
}

/** A signed VP (with an embedded signed VC) that self-verifies, echoed into `results.default`. */
async function signedVp(): Promise<Record<string, unknown>> {
	const wc = WalletCrypto();
	const issuer = await wc.generateKey('eddsa-rdfc-2022');
	const holder = await wc.generateKey('eddsa-rdfc-2022');
	const signedVc = await wc.issueCredential({
		issuer,
		credential: {
			'@context': ['https://www.w3.org/ns/credentials/v2'],
			type: ['VerifiableCredential'],
			issuer: issuer.did,
			credentialSubject: { id: holder.did }
		}
	});
	return (await wc.signPresentation({
		holder,
		challenge: 'challenge-abc',
		domain: 'https://verifier.example',
		verifiableCredential: signedVc
	})) as Record<string, unknown>;
}

describe('POST /api/wallet-runner/present-score', { timeout: 20_000 }, () => {
	it('settled complete → report with the observable MUSTs scored', async () => {
		await withCtx(async () => {
			const client = transactionServiceClient();
			const fake = asFakeTransactionServiceClient(client);
			const { exchangeId } = await client.createVerificationExchange({
				vprCredentialType: suiteVerifyDefaults.vprCredentialType,
				vprContext: suiteVerifyDefaults.vprContext
			});
			const vp = await signedVp();
			fake.advanceVerifyToActive(exchangeId);
			fake.advanceVerifyToComplete(exchangeId, { verified: true, verifiablePresentation: vp });

			const { status, payload } = await callPost({ exchangeId, profile: 'oid4' });
			expect(status).toBe(200);
			expect(payload.settled).toBe(true);
			expect(payload.state).toBe('complete');
			expect(payload.report?.verified).toBe(true);
			expect(payload.failingMustCount).toBe(0);
		});
	});

	it('not-settled (still active, verifyTask queued) → settled:false keep-polling response', async () => {
		await withCtx(async () => {
			const client = transactionServiceClient();
			const fake = asFakeTransactionServiceClient(client);
			const { exchangeId } = await client.createVerificationExchange({
				vprCredentialType: suiteVerifyDefaults.vprCredentialType,
				vprContext: suiteVerifyDefaults.vprContext
			});
			fake.advanceVerifyToActive(exchangeId);

			const { status, payload } = await callPost({ exchangeId, profile: 'oid4' });
			expect(status).toBe(200);
			expect(payload.settled).toBe(false);
			expect(payload.state).toBe('active');
			expect(payload.report).toBeUndefined();
			expect(payload.message).toMatch(/not settled/i);
		});
	});

	it('settled invalid (VP did not verify) → report verified:false, failing MUSTs', async () => {
		await withCtx(async () => {
			const client = transactionServiceClient();
			const fake = asFakeTransactionServiceClient(client);
			const { exchangeId } = await client.createVerificationExchange({
				vprCredentialType: suiteVerifyDefaults.vprCredentialType,
				vprContext: suiteVerifyDefaults.vprContext
			});
			const vp = await signedVp();
			fake.advanceVerifyToActive(exchangeId);
			fake.advanceVerifyToComplete(exchangeId, { verified: false, verifiablePresentation: vp });

			const { status, payload } = await callPost({ exchangeId, profile: 'oid4' });
			expect(status).toBe(200);
			expect(payload.settled).toBe(true);
			expect(payload.state).toBe('invalid');
			expect(payload.report?.verified).toBe(false);
			expect((payload.failingMustCount ?? 0) > 0).toBe(true);
		});
	});

	it('rejects a malformed body with 400', async () => {
		await withCtx(async () => {
			const { status } = await callPost({ profile: 'oid4' });
			expect(status).toBe(400);
		});
	});
});

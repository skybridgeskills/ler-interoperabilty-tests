import { describe, expect, it } from 'vitest';

import { WalletCrypto } from '../wallet-crypto/index.js';

import { basePresentationChecks } from './checks/base-presentation.js';
import { ExchangeChecker } from './exchange-checker.js';
import { scorePresentation } from './score-presentation.js';
import { verifyExchangeContext } from './verify-exchange-context.js';
import type { WalletExchangeView } from './wallet-check.js';

const OID4_IDS = {
	diVpNotJwt: 'oid4.wallet.credential-presentation.di-vp-not-jwt',
	sigValid: 'oid4.wallet.credential-presentation.vp-signature-valid',
	proofBinding: 'oid4.wallet.credential-presentation.proof-binding',
	delivered: 'oid4.wallet.credential-presentation.vp-delivered'
} as const;

/** Build a settled `complete` verify exchange whose echoed VP self-verifies. */
async function settledExchange(opts: { verified?: boolean } = {}): Promise<{
	exchange: WalletExchangeView;
	holderDid: string;
}> {
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
	const vp = (await wc.signPresentation({
		holder,
		challenge: 'challenge-abc',
		domain: 'https://verifier.example',
		verifiableCredential: signedVc
	})) as Record<string, unknown>;

	const verified = opts.verified ?? true;
	return {
		holderDid: holder.did,
		exchange: {
			state: verified ? 'complete' : 'invalid',
			variables: { results: { default: { verified, verifiablePresentation: vp } } }
		}
	};
}

describe('verifyExchangeContext', () => {
	it('derives holder + presentation from the echoed VP; leaves credential undefined', async () => {
		const { exchange, holderDid } = await settledExchange();
		const ctx = verifyExchangeContext(exchange, 'oid4');

		expect(ctx.presentation).toBeDefined();
		expect(ctx.credential).toBeUndefined();
		expect(ctx.holder?.did).toBe(holderDid);
		expect(ctx.holder?.cryptosuite).toBe('eddsa-rdfc-2022');
		expect(ctx.verify.verified).toBe(true);
	});

	it('no echoed VP → holder/presentation undefined (checks resolve n/a, not fail)', () => {
		const exchange: WalletExchangeView = {
			state: 'invalid',
			variables: { results: { default: { verified: false } } }
		};
		const ctx = verifyExchangeContext(exchange, 'oid4');
		expect(ctx.presentation).toBeUndefined();
		expect(ctx.holder).toBeUndefined();
		expect(basePresentationChecks[OID4_IDS.diVpNotJwt](ctx).status).toBe('n/a');
		expect(basePresentationChecks[OID4_IDS.sigValid](ctx).status).toBe('n/a');
	});
});

describe('basePresentationChecks (from a self-verifying VP)', () => {
	it('passes di-vp-not-jwt, vp-signature-valid, proof-binding, vp-delivered', async () => {
		const { exchange } = await settledExchange();
		const ctx = verifyExchangeContext(exchange, 'oid4');
		expect(basePresentationChecks[OID4_IDS.diVpNotJwt](ctx).status).toBe('pass');
		expect(basePresentationChecks[OID4_IDS.sigValid](ctx).status).toBe('pass');
		// No echoed request client_id, but a domain is present + verifier-core verified.
		expect(basePresentationChecks[OID4_IDS.proofBinding](ctx).status).toBe('pass');
		// No oid4vp var, but the exchange advanced past pending (state complete).
		expect(basePresentationChecks[OID4_IDS.delivered](ctx).status).toBe('pass');
	});

	it('vp-signature-valid fails when verifier-core did not verify', async () => {
		const { exchange } = await settledExchange({ verified: false });
		const ctx = verifyExchangeContext(exchange, 'oid4');
		expect(basePresentationChecks[OID4_IDS.sigValid](ctx).status).toBe('fail');
	});

	it('di-vp-not-jwt fails for a compact JWT VP string', () => {
		const exchange: WalletExchangeView = {
			state: 'complete',
			variables: { results: { default: { verified: true, verifiablePresentation: 'eyJ.jwt.vp' } } }
		};
		const ctx = verifyExchangeContext(exchange, 'oid4');
		expect(basePresentationChecks[OID4_IDS.diVpNotJwt](ctx).status).toBe('fail');
	});
});

describe('scorePresentation (adapter → ExchangeChecker)', () => {
	it('settled complete → verified report; observable MUSTs pass, non-observable stay n/a', async () => {
		const { exchange } = await settledExchange();
		const outcome = scorePresentation({ exchange, profile: 'oid4' });
		expect(outcome.settled).toBe(true);
		if (!outcome.settled) throw new Error('expected settled');

		expect(outcome.report.verified).toBe(true);
		expect(outcome.failingMustCount).toBe(0);

		const outcomes = outcome.report.groups.flatMap((g) => g.outcomes);
		expect(outcomes.find((o) => o.id === OID4_IDS.diVpNotJwt)?.status).toBe('pass');
		expect(outcomes.find((o) => o.id === OID4_IDS.sigValid)?.status).toBe('pass');
		// A non-observable base MUST (no registered id) resolves to n/a.
		const naMusts = outcomes.filter((o) => o.level === 'MUST' && o.status === 'n/a');
		expect(naMusts.length).toBeGreaterThan(0);
		// n/a never fails verified.
		expect(outcome.report.verified).toBe(true);
	});

	it('settled invalid (VP did not verify) → failing MUST, verified false', async () => {
		const { exchange } = await settledExchange({ verified: false });
		const outcome = scorePresentation({ exchange, profile: 'oid4' });
		expect(outcome.settled).toBe(true);
		if (!outcome.settled) throw new Error('expected settled');
		expect(outcome.report.verified).toBe(false);
		expect(outcome.failingMustCount).toBeGreaterThan(0);
	});

	it('un-settled (pending/active) → settled:false, no report (keep polling)', () => {
		expect(scorePresentation({ exchange: { state: 'pending' }, profile: 'oid4' })).toEqual({
			settled: false,
			state: 'pending'
		});
		expect(
			scorePresentation({
				exchange: { state: 'active', variables: { verifyTask: { status: 'queued' } } },
				profile: 'oid4'
			})
		).toEqual({ settled: false, state: 'active' });
	});

	it('reuses the DI-cryptosuites additive presentation checks via the adapter', async () => {
		const { exchange } = await settledExchange();
		const ctx = verifyExchangeContext(exchange, 'oid4');
		const report = ExchangeChecker().run({
			role: 'wallet',
			workflow: 'credential-presentation',
			profile: 'oid4',
			ctx
		});
		const additive = report.groups.find((g) => g.checklist.kind === 'additive');
		expect(additive).toBeDefined();
		const csRow = additive!.outcomes.find((o) =>
			o.id.endsWith('producer.vp-cryptosuite-supported')
		);
		expect(csRow?.status).toBe('pass');
	});
});

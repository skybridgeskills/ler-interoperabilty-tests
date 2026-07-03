import { describe, expect, it } from 'vitest';

import {
	FakeOid4IssuerFlow,
	type Oid4IssuerFlowObservations
} from '$lib/server/domain/wallet-client/index.js';

import { runIssuerFlowChecks } from '../issuer-flow-check.js';

import { oid4IssuerFlowChecks } from './oid4-issuer-flow.js';

const P = 'oid4.issuer.credential-issuance.';
const run = (ctx: Oid4IssuerFlowObservations) =>
	runIssuerFlowChecks(ctx, { profile: 'oid4', registry: oid4IssuerFlowChecks });
const outcome = (id: string, ctx: Oid4IssuerFlowObservations) =>
	run(ctx).outcomes.find((o) => o.id === `${P}${id}`);

describe('oid4IssuerFlowChecks', () => {
	it('passes every MUST and marks the auth-code / error-handling clauses n/a on the happy path', async () => {
		const { observations } = await FakeOid4IssuerFlow().runIssuerFlow('offer://x');
		const { report, outcomes } = run(observations);

		expect(report.verified).toBe(true);
		expect(outcomes.filter((o) => o.level === 'MUST' && o.status === 'fail')).toHaveLength(0);

		// Graded (positive) clauses.
		expect(outcome('metadata-endpoint', observations)?.status).toBe('pass');
		expect(outcome('di-vp-proof-type', observations)?.status).toBe('pass');
		expect(outcome('di-vp-signing-algs', observations)?.status).toBe('pass');
		expect(outcome('not-jwt-only-proof', observations)?.status).toBe('pass');
		expect(outcome('pre-authorized-code-flow', observations)?.status).toBe('pass');
		expect(outcome('token-endpoint-pre-authorized', observations)?.status).toBe('pass');
		expect(outcome('tls', observations)?.status).toBe('pass');
		expect(outcome('tls-credential', observations)?.status).toBe('pass');
		expect(outcome('di-proof', observations)?.status).toBe('pass');
		expect(outcome('issuer-did', observations)?.status).toBe('pass');
		expect(outcome('di-vp-required', observations)?.status).toBe('pass');
		expect(outcome('binds-verified-holder', observations)?.status).toBe('pass');
		expect(outcome('credential-endpoint', observations)?.status).toBe('pass');
		expect(outcome('valid-until', observations)?.status).toBe('pass');

		// The four clauses a happy-path pre-auth drive cannot positively verify.
		expect(outcome('authorization-code-flow', observations)?.status).toBe('n/a');
		expect(outcome('authorization-endpoint', observations)?.status).toBe('n/a');
		expect(outcome('auth-endpoint-authorization-code', observations)?.status).toBe('n/a');
		expect(outcome('authorization-error-handling', observations)?.status).toBe('n/a');
	});

	it('leaves step-3 requirements pending when the run is blocked at step 2 (no token)', () => {
		const ctx: Oid4IssuerFlowObservations = {
			offerUrl: 'offer://x',
			tls: { ok: true, protocol: 'TLSv1.3', atLeastTls12: true },
			offer: { credentialIssuer: 'https://issuer.test/exchanges/ex-1', preAuthCode: 'p' },
			issuerMeta: {
				credentialEndpoint: 'https://issuer.test/exchanges/ex-1/credential',
				proofTypesSupported: { di_vp: {} },
				diVpSigningAlgs: ['eddsa-rdfc-2022']
			},
			asMeta: { tokenEndpoint: 'https://issuer.test/exchanges/ex-1/token' },
			token: { redeemed: false },
			transcript: []
		};
		const { outcomes } = run(ctx);

		// Step 1 metadata + step 2 auth resolve; the pre-auth token clauses fail.
		expect(outcome('metadata-endpoint', ctx)?.status).toBe('pass');
		expect(outcome('pre-authorized-code-flow', ctx)?.status).toBe('fail');
		expect(outcome('authorization-endpoint', ctx)?.status).toBe('n/a');
		// Step-3 credential requirements never ran → omitted (pending).
		expect(outcomes.some((o) => o.id === `${P}binds-verified-holder`)).toBe(false);
		expect(outcomes.some((o) => o.id === `${P}di-proof`)).toBe(false);
		expect(outcomes.some((o) => o.id === `${P}valid-until`)).toBe(false);
	});

	it('fails di-vp-proof-type when the issuer metadata advertises no di_vp proof type', () => {
		const ctx: Oid4IssuerFlowObservations = {
			offerUrl: 'offer://x',
			issuerMeta: {
				credentialEndpoint: 'https://issuer.test/credential',
				proofTypesSupported: { jwt: {} }
			},
			transcript: []
		};
		expect(outcome('di-vp-proof-type', ctx)?.status).toBe('fail');
		expect(outcome('not-jwt-only-proof', ctx)?.status).toBe('fail');
	});

	it('renders unrun steps as pending (empty observations → no outcomes)', () => {
		const { outcomes, report } = run({ transcript: [] });
		expect(outcomes).toHaveLength(0);
		expect(report.verified).toBe(true);
	});
});

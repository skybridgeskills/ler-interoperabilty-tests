import { describe, expect, it } from 'vitest';

import { checkById } from '../automatic-checks.js';
import type { IssuerFlowSummary, RunEvidence } from '../evidence.js';

/**
 * The five VCALM issuer wire checks plus the shared holder-binding check,
 * ported from `wallet-runner/checks/vcalm-issuer-flow.ts`. Every case that
 * engine's behaviour implies is carried over, including the `warn`→`fail`
 * resolution on `didauth-requested`.
 */

/** A clean VCALM issuer summary — every wire fact satisfied. */
const clean: IssuerFlowSummary = {
	transport: 'vcalm',
	verified: true,
	interactionFetched: true,
	participationOk: true,
	vcapiAdvertised: true,
	didAuthRequested: true,
	interactionTls: { atLeastTls12: true, protocol: 'TLSv1.3' },
	holderDid: 'did:key:zHolder',
	subjectId: 'did:key:zHolder'
};

function evidence(flow?: IssuerFlowSummary): RunEvidence {
	return { steps: { s1: { stepId: 's1', ...(flow ? { issuerFlow: flow } : {}) } } };
}

function run(id: string, ev: RunEvidence) {
	const check = checkById(id);
	expect(check, `check "${id}" is registered`).toBeDefined();
	return check!.run({ stepId: 's1', evidence: ev });
}

const VCALM_CHECKS = [
	'vcalm-issuer-interaction-url',
	'vcalm-issuer-participation-endpoint',
	'vcalm-issuer-tls',
	'vcalm-issuer-vcapi-in-protocols',
	'vcalm-issuer-didauth-requested',
	'issuer-binds-holder-did'
];

const oid4Summary: IssuerFlowSummary = {
	transport: 'oid4vci',
	verified: true,
	metadataReachable: true,
	diVpOffered: true,
	proofTypesOffered: ['di_vp'],
	diVpSigningAlgs: ['eddsa-rdfc-2022'],
	diVpSigningAlgInBundle: true,
	preAuthCodeRedeemed: true,
	credentialDelivered: true,
	issuerTls: { atLeastTls12: true, protocol: 'TLSv1.3' },
	holderDid: 'did:key:zHolder',
	subjectId: 'did:key:zHolder'
};

describe('the VCALM issuer checks', () => {
	it('all pass on a clean summary', () => {
		for (const id of VCALM_CHECKS) expect(run(id, evidence(clean)).met, id).toBe(true);
	});

	it('all fail legibly with no summary at all, rather than throwing', () => {
		for (const id of VCALM_CHECKS) {
			const result = run(id, evidence(undefined));
			expect(result.met, id).toBe(false);
			expect(result.detail, id).toBeTruthy();
		}
	});

	it('the five vcalm-only checks fail on another transport’s summary', () => {
		for (const id of VCALM_CHECKS.filter((c) => c.startsWith('vcalm-'))) {
			const result = run(id, evidence(oid4Summary));
			expect(result.met, id).toBe(false);
			expect(result.detail, id).toMatch(/VCALM/);
		}
	});

	it('`issuer-binds-holder-did` is shared — it reads an OID4 summary too', () => {
		expect(run('issuer-binds-holder-did', evidence(oid4Summary)).met).toBe(true);
	});
});

describe('vcalm-issuer-interaction-url and vcalm-issuer-participation-endpoint', () => {
	it('both fail when the interaction never resolved', () => {
		const flow: IssuerFlowSummary = {
			...clean,
			interactionFetched: false,
			participationOk: false
		};
		expect(run('vcalm-issuer-interaction-url', evidence(flow)).met).toBe(false);
		expect(run('vcalm-issuer-participation-endpoint', evidence(flow)).met).toBe(false);
	});

	it('both say plainly that they share one probe', () => {
		expect(run('vcalm-issuer-interaction-url', evidence(clean)).detail).toMatch(/probe/i);
		expect(run('vcalm-issuer-participation-endpoint', evidence(clean)).detail).toMatch(/probe/i);
	});
});

describe('vcalm-issuer-tls', () => {
	it('fails below TLS 1.2, carrying the probe’s reason', () => {
		const flow: IssuerFlowSummary = {
			...clean,
			interactionTls: { atLeastTls12: false, error: 'The endpoint is not served over HTTPS.' }
		};
		const result = run('vcalm-issuer-tls', evidence(flow));
		expect(result.met).toBe(false);
		expect(result.detail).toMatch(/not served over HTTPS/);
	});

	it('fails with its own wording when the probe reported no reason', () => {
		const flow: IssuerFlowSummary = { ...clean, interactionTls: { atLeastTls12: false } };
		expect(run('vcalm-issuer-tls', evidence(flow))).toMatchObject({ met: false });
	});
});

describe('vcalm-issuer-vcapi-in-protocols', () => {
	it('fails when no `vcapi` URL was advertised', () => {
		expect(
			run('vcalm-issuer-vcapi-in-protocols', evidence({ ...clean, vcapiAdvertised: false })).met
		).toBe(false);
	});
});

describe('vcalm-issuer-didauth-requested', () => {
	it('fails when no challenge came back', () => {
		const result = run(
			'vcalm-issuer-didauth-requested',
			evidence({ ...clean, didAuthRequested: false })
		);
		expect(result.met).toBe(false);
		expect(result.detail).toMatch(/challenge/i);
	});

	it('FAILS on a challenge with no DIDAuthentication query — the engine’s `warn`, resolved (M11)', () => {
		const result = run(
			'vcalm-issuer-didauth-requested',
			evidence({ ...clean, didAuthQueryMissing: true })
		);
		expect(result.met).toBe(false);
		expect(result.detail).toMatch(/DIDAuthentication/);
	});
});

describe('issuer-binds-holder-did', () => {
	it('fails when the subject is not the authenticated holder, naming both', () => {
		const result = run(
			'issuer-binds-holder-did',
			evidence({ ...clean, subjectId: 'mailto:learner@example.edu' })
		);
		expect(result.met).toBe(false);
		expect(result.detail).toMatch(/mailto:learner@example.edu/);
		expect(result.detail).toMatch(/did:key:zHolder/);
	});

	it('fails when no DID was ever authenticated', () => {
		const flow: IssuerFlowSummary = { ...clean, holderDid: undefined, subjectId: undefined };
		expect(run('issuer-binds-holder-did', evidence(flow)).met).toBe(false);
	});

	it('fails on a direct paste, which has no exchange to bind against', () => {
		const result = run(
			'issuer-binds-holder-did',
			evidence({ transport: 'direct', verified: true })
		);
		expect(result.met).toBe(false);
		expect(result.detail).toMatch(/no exchange/i);
	});

	it('fails when the subject is missing entirely', () => {
		const flow: IssuerFlowSummary = { ...clean, subjectId: undefined };
		const result = run('issuer-binds-holder-did', evidence(flow));
		expect(result.met).toBe(false);
		expect(result.detail).toMatch(/missing/);
	});
});

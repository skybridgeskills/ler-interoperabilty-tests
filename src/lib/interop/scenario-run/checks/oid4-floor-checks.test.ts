import { describe, expect, it } from 'vitest';

import { checkById } from '../automatic-checks.js';
import type { RunEvidence, VerifierPresentResult, VerifierRequestSummary } from '../evidence.js';

/** A clean OID4VP by-reference request summary — every floor fact satisfied. */
const cleanRequest: VerifierRequestSummary = {
	transport: 'oid4vp',
	requestForm: 'by-reference',
	requestResolved: true,
	matchable: true,
	diVpFormat: 'di',
	requestTls: { atLeastTls12: true, protocol: 'TLSv1.3' },
	responseTls: { atLeastTls12: true, protocol: 'TLSv1.3' }
};

/** The request did not resolve — the scored intake failure (present skipped). */
const unresolved: VerifierRequestSummary = {
	transport: 'oid4vp',
	requestForm: 'by-reference',
	requestResolved: false,
	matchable: false,
	matchReason: 'The request did not resolve.',
	diVpFormat: 'unpinned',
	requestTls: { atLeastTls12: false, error: 'not probed' },
	responseTls: { atLeastTls12: false, error: 'not probed' }
};

function evidence(request?: VerifierRequestSummary, present?: VerifierPresentResult): RunEvidence {
	return {
		steps: {
			s1: {
				stepId: 's1',
				...(request ? { verifierRequest: request } : {}),
				...(present ? { verifierPresent: present } : {})
			}
		}
	};
}

function run(id: string, ev: RunEvidence) {
	const check = checkById(id);
	if (!check) throw new Error(`check "${id}" is not registered`);
	return check.run({ stepId: 's1', evidence: ev });
}

const FLOOR_IDS = [
	'oid4-request-endpoint',
	'oid4-request-matchable',
	'oid4-request-di-vp-format',
	'oid4-request-tls',
	'oid4-response-tls'
] as const;

describe('oid4 floor + delivery automatic checks', () => {
	it('registers all six', () => {
		for (const id of [...FLOOR_IDS, 'oid4-response-endpoint']) {
			expect(checkById(id)).toBeDefined();
		}
	});

	it('passes every floor check on a clean request', () => {
		for (const id of FLOOR_IDS) {
			expect(run(id, evidence(cleanRequest)).met, id).toBe(true);
		}
	});

	it('fails the resolvable/matchable/tls floor checks when the request did not resolve', () => {
		for (const id of ['oid4-request-endpoint', 'oid4-request-matchable', 'oid4-response-tls']) {
			const result = run(id, evidence(unresolved));
			expect(result.met, id).toBe(false);
			expect(result.detail, id).toBeTruthy();
		}
	});

	it('di-vp-format fails only on a JWT-only request; di and unpinned both pass', () => {
		expect(
			run('oid4-request-di-vp-format', evidence({ ...cleanRequest, diVpFormat: 'di' })).met
		).toBe(true);
		expect(
			run('oid4-request-di-vp-format', evidence({ ...cleanRequest, diVpFormat: 'unpinned' })).met
		).toBe(true);
		const jwtOnly = run(
			'oid4-request-di-vp-format',
			evidence({ ...cleanRequest, diVpFormat: 'jwt-only' })
		);
		expect(jwtOnly.met).toBe(false);
		expect(jwtOnly.detail).toMatch(/JWT/);
	});

	it('request-tls reads an inline request as met (no endpoint to fault)', () => {
		const inline: VerifierRequestSummary = {
			...cleanRequest,
			requestForm: 'inline',
			requestTls: { atLeastTls12: true, protocol: 'inline (no request endpoint)' }
		};
		const result = run('oid4-request-tls', evidence(inline));
		expect(result.met).toBe(true);
		expect(result.detail).toMatch(/inline/i);
	});

	it('request-tls fails a by-reference request on TLS < 1.2', () => {
		const badTls: VerifierRequestSummary = {
			...cleanRequest,
			requestTls: { atLeastTls12: false, error: 'it negotiated TLSv1.1, below TLS 1.2' }
		};
		const result = run('oid4-request-tls', evidence(badTls));
		expect(result.met).toBe(false);
		expect(result.detail).toMatch(/TLS/);
	});

	it('matchable surfaces the match reason when the definition did not match', () => {
		const request: VerifierRequestSummary = {
			...cleanRequest,
			matchable: false,
			matchReason: 'The presentation definition does not ask for an OpenBadgeCredential.'
		};
		const result = run('oid4-request-matchable', evidence(request));
		expect(result.met).toBe(false);
		expect(result.detail).toMatch(/OpenBadgeCredential/);
	});

	it('delivery passes when the credential was submitted, fails otherwise', () => {
		expect(run('oid4-response-endpoint', evidence(cleanRequest, { submitted: true })).met).toBe(
			true
		);
		const missed = run(
			'oid4-response-endpoint',
			evidence(cleanRequest, { submitted: false, error: { message: 'Verifier responded 422.' } })
		);
		expect(missed.met).toBe(false);
		expect(missed.detail).toMatch(/422/);
	});

	it('every check fails clean when the step did not present', () => {
		for (const id of [...FLOOR_IDS, 'oid4-response-endpoint']) {
			const result = run(id, evidence());
			expect(result.met, id).toBe(false);
			expect(result.detail, id).toMatch(/did not present/i);
		}
	});

	it('a vcalm-transport summary fails the oid4 request checks (transport narrow)', () => {
		const vcalm: VerifierRequestSummary = {
			transport: 'vcalm',
			vcapiAdvertised: true,
			vprReceived: true,
			vprMatched: true,
			didAuth: true,
			requestTls: { atLeastTls12: true, protocol: 'TLSv1.3' },
			responseTls: { atLeastTls12: true, protocol: 'TLSv1.3' }
		};
		for (const id of FLOOR_IDS) {
			const result = run(id, evidence(vcalm));
			expect(result.met, id).toBe(false);
			expect(result.detail, id).toMatch(/OID4VP/);
		}
	});
});

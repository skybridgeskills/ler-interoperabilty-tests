import { describe, expect, it } from 'vitest';

import { checkById } from '../automatic-checks.js';
import type { RunEvidence, VerifierPresentResult, VerifierRequestSummary } from '../evidence.js';

/** A clean VCALM request summary — every floor fact satisfied. */
const cleanRequest: VerifierRequestSummary = {
	transport: 'vcalm',
	vcapiAdvertised: true,
	vprReceived: true,
	vprMatched: true,
	didAuth: true,
	requestTls: { atLeastTls12: true, protocol: 'TLSv1.3' },
	responseTls: { atLeastTls12: true, protocol: 'TLSv1.3' }
};

/** Intake failure — the interaction URL resolved no `vcapi` endpoint. */
const intakeFailure: VerifierRequestSummary = {
	transport: 'vcalm',
	vcapiAdvertised: false,
	vprReceived: false,
	vprMatched: false,
	didAuth: false,
	requestTls: { atLeastTls12: false, error: 'Endpoint is not served over HTTPS.' },
	responseTls: { atLeastTls12: false, error: 'The exchange advertised no endpoint to probe.' }
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
	'vcalm-interaction-endpoint',
	'vcalm-vpr-query',
	'vcalm-vpr-didauth',
	'vcalm-request-tls',
	'vcalm-response-tls'
] as const;

describe('vcalm floor + delivery automatic checks', () => {
	it('registers all six', () => {
		for (const id of [...FLOOR_IDS, 'vcalm-response-endpoint']) {
			expect(checkById(id)).toBeDefined();
		}
	});

	it('passes every floor check on a clean request', () => {
		for (const id of FLOOR_IDS) {
			expect(run(id, evidence(cleanRequest)).met, id).toBe(true);
		}
	});

	it('fails every floor check cleanly on intake failure — no cascading n/a', () => {
		for (const id of FLOOR_IDS) {
			const result = run(id, evidence(intakeFailure));
			expect(result.met, id).toBe(false);
			expect(result.detail, id).toBeTruthy();
		}
	});

	it('vpr-query surfaces the match reason when the VPR did not ask for an OB3', () => {
		const request: VerifierRequestSummary = {
			...cleanRequest,
			vprMatched: false,
			matchReason: 'The QueryByExample query does not ask for an OpenBadgeCredential.'
		};
		const result = run('vcalm-vpr-query', evidence(request));
		expect(result.met).toBe(false);
		expect(result.detail).toMatch(/OpenBadgeCredential/);
	});

	it('vpr-query fails distinctly when no VPR was returned', () => {
		const result = run('vcalm-vpr-query', evidence({ ...cleanRequest, vprReceived: false }));
		expect(result.met).toBe(false);
		expect(result.detail).toMatch(/no presentation request/i);
	});

	it('request/response TLS carry the failure reason as detail', () => {
		expect(run('vcalm-request-tls', evidence(intakeFailure)).detail).toMatch(/TLS 1\.2/);
		expect(run('vcalm-response-tls', evidence(intakeFailure)).detail).toMatch(/TLS 1\.2/);
	});

	it('delivery passes when the credential was submitted, fails otherwise', () => {
		expect(run('vcalm-response-endpoint', evidence(cleanRequest, { submitted: true })).met).toBe(
			true
		);
		const missed = run(
			'vcalm-response-endpoint',
			evidence(cleanRequest, { submitted: false, error: { message: 'Exchange responded 422.' } })
		);
		expect(missed.met).toBe(false);
		expect(missed.detail).toMatch(/422/);
	});

	it('every check fails clean when the step did not present', () => {
		for (const id of [...FLOOR_IDS, 'vcalm-response-endpoint']) {
			const result = run(id, evidence());
			expect(result.met, id).toBe(false);
			expect(result.detail, id).toMatch(/did not present/i);
		}
	});
});

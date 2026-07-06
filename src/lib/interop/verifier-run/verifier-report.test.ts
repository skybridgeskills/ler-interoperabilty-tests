import { describe, expect, it } from 'vitest';

import {
	VerifierCheckOutcome,
	VerifierChecklistGroupRef,
	VerifierRunnerReport
} from './verifier-report.js';

const groupRef: VerifierChecklistGroupRef = {
	kind: 'base',
	profileSlug: 'ob3-direct-delivery',
	profileName: 'OB 3.0 Direct Delivery Profile',
	workflow: 'direct-credential-verification',
	role: 'verifier'
};

function attestedOutcome(): VerifierCheckOutcome {
	return VerifierCheckOutcome({
		id: 'ob3-direct-delivery.verifier-rejects-expired',
		level: 'MUST',
		status: 'pass',
		message: 'Rejected the expired credential.',
		source: 'attested',
		attestation: {
			passLabel: 'Pass 3',
			kind: 'expired',
			verdict: 'rejected',
			reason: 'expiry'
		}
	});
}

describe('VerifierCheckOutcome', () => {
	it('round-trips an attested outcome with attestation details', () => {
		const outcome = attestedOutcome();
		expect(VerifierCheckOutcome.schema.parse(outcome)).toEqual(outcome);
	});

	it('round-trips an automated outcome without attestation', () => {
		const outcome = VerifierCheckOutcome({
			id: 'ob3-direct-delivery.verifier-rejects-revoked',
			level: 'MUST',
			status: 'n/a',
			message: 'Revocation pass deferred.',
			source: 'automated'
		});
		expect(outcome.attestation).toBeUndefined();
	});

	it('rejects a missing source', () => {
		expect(() =>
			VerifierCheckOutcome.schema.parse({
				id: 'x',
				level: 'MUST',
				status: 'pass',
				message: 'ok'
			})
		).toThrow();
	});

	it('rejects an attestation with a bad kind', () => {
		expect(() =>
			VerifierCheckOutcome.schema.parse({
				id: 'x',
				level: 'MUST',
				status: 'pass',
				message: 'ok',
				source: 'attested',
				attestation: { passLabel: 'Pass 1', kind: 'mystery', verdict: 'rejected' }
			})
		).toThrow();
	});
});

describe('VerifierRunnerReport', () => {
	it('round-trips a report with groups, activity, and artifacts', () => {
		const report = VerifierRunnerReport({
			verified: true,
			failingMustCount: 0,
			groups: [{ checklist: groupRef, outcomes: [attestedOutcome()] }],
			activity: [{ id: 'a1', kind: 'interaction', label: 'Handed over Pass 1', status: 'info' }],
			artifacts: [{ kind: 'credential', title: 'Pass 1 credential', verified: true }]
		});

		expect(VerifierRunnerReport.schema.parse(report)).toEqual(report);
	});

	it('rejects a negative failingMustCount', () => {
		expect(() =>
			VerifierRunnerReport.schema.parse({
				verified: false,
				failingMustCount: -1,
				groups: [],
				activity: [],
				artifacts: []
			})
		).toThrow();
	});
});

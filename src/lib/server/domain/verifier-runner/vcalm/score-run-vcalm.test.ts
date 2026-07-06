import { describe, expect, it } from 'vitest';

import {
	PassKind,
	type PassAttestation,
	type PresentEvidence,
	type RejectionReason,
	type VerifierCheckOutcome,
	type VerifierRunPlan
} from '$lib/interop/verifier-run/index.js';

import { VerifierRunMismatchError } from '../score-run.js';

import { scoreVcalmRun } from './score-run-vcalm.js';

const EXCHANGE_ENDPOINT_ROW_ID = 'vcalm.verifier-exchange-endpoint';

/** The five automated floor rows the vcalm inspect/present flow writes. */
const VCALM_FLOOR_ROW_IDS = [
	'vcalm.verifier-interaction-endpoint',
	'vcalm.verifier-vpr-query',
	'vcalm.verifier-vpr-didauth',
	'vcalm.verifier-request-tls',
	'vcalm.verifier-response-tls'
];

function plan(): VerifierRunPlan {
	return {
		runId: 'run-1',
		profile: 'vcalm',
		workflow: 'credential-request-and-verification',
		cryptosuite: 'eddsa-rdfc-2022',
		entries: PassKind.schema.options.map((kind, index) => ({
			passId: `pass-${kind}`,
			label: `Credential ${index + 1}`,
			kind
		}))
	};
}

function evidenceFor(p: VerifierRunPlan, validSubmitted = true): PresentEvidence[] {
	return p.entries.map((entry) => ({
		passId: entry.passId,
		submitted: entry.kind === 'valid' ? validSubmitted : true,
		transportStatus: entry.kind === 'valid' && !validSubmitted ? 400 : 200,
		credential: { type: ['VerifiableCredential', 'OpenBadgeCredential'] },
		...(entry.kind === 'valid' && !validSubmitted
			? { submissionError: 'Exchange responded 400.' }
			: {})
	}));
}

const CORRECT_REASON: Record<string, RejectionReason> = {
	'broken-signature': 'signature',
	'schema-problem': 'schema',
	expired: 'expiry'
};

function attestationsFor(p: VerifierRunPlan): PassAttestation[] {
	return p.entries.map((entry) =>
		entry.kind === 'valid'
			? { passId: entry.passId, verdict: 'accepted' }
			: { passId: entry.passId, verdict: 'rejected', reason: CORRECT_REASON[entry.kind] }
	);
}

function floorPass(): VerifierCheckOutcome[] {
	return VCALM_FLOOR_ROW_IDS.map((id) => ({
		id,
		level: 'MUST',
		status: 'pass',
		message: 'ok',
		source: 'automated'
	}));
}

describe('scoreVcalmRun', () => {
	it('verifies a clean run: floor + delivery + correct attestations all pass', () => {
		const p = plan();
		const report = scoreVcalmRun({
			plan: p,
			evidence: evidenceFor(p),
			attestations: attestationsFor(p),
			floorOutcomes: floorPass()
		});

		expect(report.verified).toBe(true);
		expect(report.failingMustCount).toBe(0);
		const delivery = report.groups
			.flatMap((g) => g.outcomes)
			.find((o) => o.id === EXCHANGE_ENDPOINT_ROW_ID);
		expect(delivery?.status).toBe('pass');
		expect(report.artifacts).toHaveLength(4);
	});

	it('fails the exchange-endpoint row when the VALID credential was not delivered', () => {
		const p = plan();
		const report = scoreVcalmRun({
			plan: p,
			evidence: evidenceFor(p, false),
			attestations: attestationsFor(p),
			floorOutcomes: floorPass()
		});

		const delivery = report.groups
			.flatMap((g) => g.outcomes)
			.find((o) => o.id === EXCHANGE_ENDPOINT_ROW_ID);
		expect(delivery?.status).toBe('fail');
		expect(delivery?.message).toMatch(/400/);
		expect(report.verified).toBe(false);
	});

	it('counts a failing floor row toward the MUST failures', () => {
		const p = plan();
		const floor = floorPass();
		floor[0] = { ...floor[0], status: 'fail', message: 'no vcapi' };
		const report = scoreVcalmRun({
			plan: p,
			evidence: evidenceFor(p),
			attestations: attestationsFor(p),
			floorOutcomes: floor
		});
		expect(report.verified).toBe(false);
		expect(report.failingMustCount).toBeGreaterThanOrEqual(1);
	});

	it('throws on missing present evidence for a plan entry', () => {
		const p = plan();
		const evidence = evidenceFor(p).slice(1);
		expect(() =>
			scoreVcalmRun({
				plan: p,
				evidence,
				attestations: attestationsFor(p),
				floorOutcomes: floorPass()
			})
		).toThrow(VerifierRunMismatchError);
	});

	it('throws on evidence for an unknown pass', () => {
		const p = plan();
		const evidence = [...evidenceFor(p), { passId: 'ghost', submitted: true, credential: {} }];
		expect(() =>
			scoreVcalmRun({
				plan: p,
				evidence,
				attestations: attestationsFor(p),
				floorOutcomes: floorPass()
			})
		).toThrow(VerifierRunMismatchError);
	});
});

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

import { OID4_FLOOR_ROW_IDS } from './inspect-checks.js';
import { scoreOid4Run } from './score-run-oid4.js';

const RESPONSE_ENDPOINT_ROW_ID = 'oid4.verifier-response-endpoint';

function plan(): VerifierRunPlan {
	return {
		runId: 'run-1',
		profile: 'oid4',
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
			? { submissionError: 'OID4VP direct_post responded 400.' }
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

/** All five automated floor rows resolved pass (as the inspect endpoint would on a clean request). */
function floorPass(): VerifierCheckOutcome[] {
	return Object.values(OID4_FLOOR_ROW_IDS).map((id) => ({
		id,
		level: 'MUST',
		status: 'pass',
		message: 'ok',
		source: 'automated'
	}));
}

describe('scoreOid4Run', () => {
	it('verifies a clean run: floor + delivery + correct attestations all pass', () => {
		const p = plan();
		const report = scoreOid4Run({
			plan: p,
			evidence: evidenceFor(p),
			attestations: attestationsFor(p),
			floorOutcomes: floorPass()
		});

		expect(report.verified).toBe(true);
		expect(report.failingMustCount).toBe(0);
		const outcomes = report.groups.flatMap((g) => g.outcomes);
		const delivery = outcomes.find((o) => o.id === RESPONSE_ENDPOINT_ROW_ID);
		expect(delivery?.status).toBe('pass');
		// Reveal artifacts come from the delivered credentials in evidence.
		expect(report.artifacts).toHaveLength(4);
	});

	it('fails the response-endpoint row when the VALID credential was not delivered', () => {
		const p = plan();
		const report = scoreOid4Run({
			plan: p,
			evidence: evidenceFor(p, false),
			attestations: attestationsFor(p),
			floorOutcomes: floorPass()
		});

		const delivery = report.groups
			.flatMap((g) => g.outcomes)
			.find((o) => o.id === RESPONSE_ENDPOINT_ROW_ID);
		expect(delivery?.status).toBe('fail');
		expect(delivery?.message).toMatch(/400/);
		expect(report.verified).toBe(false);
	});

	it('counts a failing floor row toward the MUST failures', () => {
		const p = plan();
		const floor = floorPass();
		floor[0] = { ...floor[0], status: 'fail', message: 'TLS too low' };
		const report = scoreOid4Run({
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
			scoreOid4Run({
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
			scoreOid4Run({
				plan: p,
				evidence,
				attestations: attestationsFor(p),
				floorOutcomes: floorPass()
			})
		).toThrow(VerifierRunMismatchError);
	});
});

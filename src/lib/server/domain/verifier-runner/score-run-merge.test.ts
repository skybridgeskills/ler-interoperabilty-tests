import { describe, expect, it } from 'vitest';

import {
	PassKind,
	type PassAttestation,
	type RejectionReason,
	type VerifierCheckOutcome,
	type VerifierRunDefinition,
	type VerifierRunnerReport
} from '$lib/interop/verifier-run/index.js';

import { VERIFIER_ROW_IDS, verifierRowIdsFor } from './row-registry.js';
import { scoreVerifierRun, VerifierRunMismatchError } from './score-run.js';

const OID4_ROW_IDS = verifierRowIdsFor('oid4', 'credential-request-and-verification')!;

/** A credential-less oid4 run: passes carry identity + kind only (present-time generation). */
function oid4Run(): VerifierRunDefinition {
	return {
		runId: 'oid4-run-1',
		profile: 'oid4',
		workflow: 'credential-request-and-verification',
		cryptosuite: 'eddsa-rdfc-2022',
		passes: PassKind.schema.options.map((kind, index) => ({
			passId: `oid4-pass-${index + 1}`,
			label: `Credential ${index + 1}`,
			kind
		}))
	};
}

const CORRECT: Record<PassKind, PassAttestation['verdict']> = {
	valid: 'accepted',
	'broken-signature': 'rejected',
	'schema-problem': 'rejected',
	expired: 'rejected'
};
const CORRECT_REASON: Partial<Record<PassKind, RejectionReason>> = {
	'broken-signature': 'signature',
	'schema-problem': 'schema',
	expired: 'expiry'
};

function correctAttestations(run: VerifierRunDefinition): PassAttestation[] {
	return run.passes.map((pass): PassAttestation => {
		const reason = CORRECT_REASON[pass.kind];
		return { passId: pass.passId, verdict: CORRECT[pass.kind], ...(reason ? { reason } : {}) };
	});
}

function automatedOutcome(overrides: Partial<VerifierCheckOutcome> = {}): VerifierCheckOutcome {
	return {
		id: 'oid4.verifier-request-tls',
		level: 'MUST',
		status: 'pass',
		message: 'TLS 1.3 on the response endpoint.',
		source: 'automated',
		...overrides
	};
}

function rowById(report: VerifierRunnerReport, id: string) {
	return report.groups[0].outcomes.find((o) => o.id === id);
}

describe('row registry', () => {
	it('registers the three scorable verifier combinations', () => {
		expect(verifierRowIdsFor('ob3-direct-delivery', 'direct-credential-verification')).toBe(
			VERIFIER_ROW_IDS['ob3-direct-delivery']?.['direct-credential-verification']
		);
		expect(OID4_ROW_IDS.revoked).toBe('oid4.verifier-rejects-revoked');
		expect(verifierRowIdsFor('vcalm', 'credential-request-and-verification')?.revoked).toBe(
			'vcalm.verifier-rejects-revoked'
		);
	});

	it('rejects a (profile, workflow) with no registry entry', () => {
		// oid4 is scorable only under credential-request-and-verification — no
		// registry entry (nor verifier checklist) exists for direct-credential-verification.
		const run = { ...oid4Run(), workflow: 'direct-credential-verification' as const };
		expect(() => scoreVerifierRun({ run, attestations: correctAttestations(run) })).toThrow(
			VerifierRunMismatchError
		);
	});
});

describe('scoreVerifierRun (oid4, credential-less)', () => {
	it('scores every acceptance row from attestations without pass credentials', () => {
		const run = oid4Run();
		const report = scoreVerifierRun({ run, attestations: correctAttestations(run) });

		expect(report.verified).toBe(true);
		expect(report.failingMustCount).toBe(0);
		for (const id of Object.values(OID4_ROW_IDS.acceptance)) {
			expect(rowById(report, id)).toMatchObject({ status: 'pass', source: 'attested' });
		}
	});

	it('defers the oid4 revoked row as an automated n/a', () => {
		const run = oid4Run();
		const report = scoreVerifierRun({ run, attestations: correctAttestations(run) });
		expect(rowById(report, OID4_ROW_IDS.revoked)).toMatchObject({
			status: 'n/a',
			source: 'automated',
			level: 'MUST'
		});
	});

	it('builds reveal activity and titled artifacts even without credentials', () => {
		const run = oid4Run();
		const report = scoreVerifierRun({ run, attestations: correctAttestations(run) });

		expect(report.activity.map((a) => a.id)).toEqual(
			run.passes.map((p) => `verifier-pass.${p.passId}`)
		);
		expect(report.activity.every((a) => a.stepIndex === 2)).toBe(true);
		expect(report.artifacts.map((a) => a.title)).toEqual([
			'Credential 1 — valid',
			'Credential 2 — broken signature',
			'Credential 3 — schema problem',
			'Credential 4 — expired'
		]);
		expect(report.artifacts.every((a) => a.issuer === undefined)).toBe(true);
	});
});

describe('scoreVerifierRun automated-outcome merge', () => {
	function scoreWith(automatedOutcomes: VerifierCheckOutcome[]) {
		const run = oid4Run();
		return scoreVerifierRun({ run, attestations: correctAttestations(run), automatedOutcomes });
	}

	it('resolves automated-only rows from automatedOutcomes', () => {
		const report = scoreWith([automatedOutcome()]);
		expect(rowById(report, 'oid4.verifier-request-tls')).toMatchObject({
			status: 'pass',
			source: 'automated',
			message: 'TLS 1.3 on the response endpoint.'
		});
	});

	it('counts automated MUST fails in failingMustCount and flips verified', () => {
		const report = scoreWith([
			automatedOutcome({
				id: 'oid4.verifier-request-matchable',
				status: 'fail',
				message: 'No seeded credential matches the presentation definition.'
			})
		]);
		expect(report.verified).toBe(false);
		expect(report.failingMustCount).toBe(1);
	});

	it('lets an attested outcome win over an automated one for the same id', () => {
		const report = scoreWith([
			automatedOutcome({
				id: OID4_ROW_IDS.acceptance.valid,
				status: 'fail',
				message: 'Should never surface.'
			})
		]);
		expect(rowById(report, OID4_ROW_IDS.acceptance.valid)).toMatchObject({
			status: 'pass',
			source: 'attested'
		});
		expect(report.verified).toBe(true);
	});

	it('adds no activity entries for automated outcomes', () => {
		const report = scoreWith([automatedOutcome()]);
		expect(report.activity).toHaveLength(4);
	});
});

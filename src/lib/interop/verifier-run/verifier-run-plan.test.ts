import { describe, expect, it } from 'vitest';

import { VerifierRunPlan, VerifierRunPlanEntry } from './verifier-run-plan.js';

function entry(overrides: Partial<VerifierRunPlanEntry> = {}): VerifierRunPlanEntry {
	return VerifierRunPlanEntry({
		passId: 'pass-1',
		label: 'Credential 1',
		kind: 'valid',
		...overrides
	});
}

describe('VerifierRunPlanEntry', () => {
	it('round-trips a credential-less entry', () => {
		const e = entry();
		expect(VerifierRunPlanEntry.schema.parse(e)).toEqual(e);
	});

	it('rejects an unknown kind', () => {
		expect(() =>
			VerifierRunPlanEntry.schema.parse({
				passId: 'pass-1',
				label: 'Credential 1',
				kind: 'revoked'
			})
		).toThrow();
	});

	it('rejects an empty pass id', () => {
		expect(() =>
			VerifierRunPlanEntry.schema.parse({ passId: '', label: 'Credential 1', kind: 'valid' })
		).toThrow();
	});
});

describe('VerifierRunPlan', () => {
	it('round-trips a plan with ordered entries', () => {
		const plan = VerifierRunPlan({
			runId: 'run-1',
			profile: 'oid4',
			workflow: 'credential-request-and-verification',
			cryptosuite: 'eddsa-rdfc-2022',
			entries: [entry(), entry({ passId: 'pass-2', label: 'Credential 2', kind: 'expired' })]
		});

		expect(VerifierRunPlan.schema.parse(plan)).toEqual(plan);
		expect(plan.entries.map((e) => e.passId)).toEqual(['pass-1', 'pass-2']);
	});

	it('rejects an entry carrying a credential-bearing shape with a bad kind', () => {
		expect(() =>
			VerifierRunPlan.schema.parse({
				runId: 'run-1',
				profile: 'oid4',
				workflow: 'credential-request-and-verification',
				cryptosuite: 'eddsa-rdfc-2022',
				entries: [{ passId: 'pass-1', label: 'Credential 1', kind: 'mystery' }]
			})
		).toThrow();
	});

	it('rejects an unknown profile slug', () => {
		expect(() =>
			VerifierRunPlan.schema.parse({
				runId: 'run-1',
				profile: 'not-a-profile',
				workflow: 'credential-request-and-verification',
				cryptosuite: 'eddsa-rdfc-2022',
				entries: [entry()]
			})
		).toThrow();
	});
});

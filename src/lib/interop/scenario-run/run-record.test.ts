import { describe, expect, it } from 'vitest';

import { scenarioFingerprint } from '$lib/interop/scenarios/index.js';

import { recordFromRunState, ScenarioRunRecord } from './run-record.js';
import { answerRequirement, settleStep, startRun } from './run-state.js';
import { affirmRequirement, autoRequirement, testScenario, testStep } from './test-scenario.js';

const AT = '2026-08-13T10:00:00.000Z';
const scenario = testScenario({
	steps: [testStep({ requirements: [autoRequirement(), affirmRequirement()] })]
});

const completeExchange = {
	stepId: 'offer',
	exchange: { state: 'complete' as const, variables: { holderDid: 'did:key:z6Mk' } }
};

/** A run taken all the way through: automatic settled, attested answered. */
function finishedRun(answer: boolean) {
	let state = startRun(scenario, { now: AT, shuffleSeed: 'seed' });
	state = settleStep(scenario, state, 'offer', completeExchange);
	return answerRequirement(scenario, state, 'stored', { kind: 'affirm', value: answer });
}

describe('ScenarioRunRecord', () => {
	it('defaults `attempts` to 1 — the store owns incrementing it', () => {
		const record = ScenarioRunRecord({
			scenarioSlug: 'oid4-wallet-acceptance',
			fingerprint: 'abc',
			status: 'passed',
			outcomes: {}
		});

		expect(record.attempts).toBe(1);
	});

	it('defaults `ranAt` to now', () => {
		const record = ScenarioRunRecord({
			scenarioSlug: 'oid4-wallet-acceptance',
			fingerprint: 'abc',
			status: 'passed',
			outcomes: {}
		});

		expect(Date.parse(record.ranAt)).not.toBeNaN();
	});
});

describe('recordFromRunState', () => {
	it('carries the fingerprint the run scored against, not the live one', () => {
		const record = recordFromRunState(scenario, finishedRun(true), AT);

		expect(record.fingerprint).toBe(scenarioFingerprint(scenario));
	});

	it('persists no evidence — not the trace, not the artifact, not the summary', () => {
		let state = startRun(scenario, { now: AT, shuffleSeed: 'seed' });
		state = settleStep(scenario, state, 'offer', {
			...completeExchange,
			artifact: { type: ['VerifiableCredential'] },
			trace: {
				stages: [{ name: 'credential', label: 'Credential request', status: 500, ok: false }]
			}
		});
		state = answerRequirement(scenario, state, 'stored', { kind: 'affirm', value: true });

		// A stored run is a list of outcomes. The trace is live-only, exactly as
		// the legacy era's `raw` was — reopening a run shows no packet capture.
		const record = recordFromRunState(scenario, state, AT);
		const serialised = JSON.stringify(record);
		expect(serialised).not.toContain('trace');
		expect(serialised).not.toContain('Credential request');
		expect(Object.keys(record)).toEqual([
			'scenarioSlug',
			'ranAt',
			'fingerprint',
			'status',
			'outcomes',
			'attempts'
		]);
	});

	it('rolls the run up to a status', () => {
		expect(recordFromRunState(scenario, finishedRun(true), AT).status).toBe('passed');
		expect(recordFromRunState(scenario, finishedRun(false), AT).status).toBe('failed');
	});

	it('is `incomplete` while a requirement is unanswered', () => {
		const midRun = settleStep(
			scenario,
			startRun(scenario, { now: AT, shuffleSeed: 'seed' }),
			'offer',
			completeExchange
		);

		expect(recordFromRunState(scenario, midRun, AT).status).toBe('incomplete');
	});

	it('persists every outcome, automated and attested alike', () => {
		const record = recordFromRunState(scenario, finishedRun(true), AT);

		expect(record.outcomes['exchange-complete'].source).toBe('automated');
		expect(record.outcomes.stored.source).toBe('attested');
	});

	it('denormalises the expected answer, so a stored run renders its own reveal', () => {
		const record = recordFromRunState(scenario, finishedRun(false), AT);

		expect(record.outcomes.stored).toMatchObject({
			answer: { kind: 'affirm', value: false },
			expected: { kind: 'affirm', value: true }
		});
	});

	it('round-trips through the schema — everything it holds is persistable', () => {
		const record = recordFromRunState(scenario, finishedRun(true), AT);

		expect(ScenarioRunRecord(JSON.parse(JSON.stringify(record)))).toEqual(record);
	});
});

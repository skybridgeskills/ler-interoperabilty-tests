import { describe, expect, it } from 'vitest';

import type { RequirementOutcome } from './requirement-outcome.js';
import { failingShoulds, rollUpScenario, unansweredRequirements } from './roll-up.js';
import { affirmRequirement, chooseRequirement, testScenario, testStep } from './test-scenario.js';

const scenario = testScenario({
	steps: [testStep({ requirements: [affirmRequirement(), chooseRequirement()] })]
});

/** Build an outcome map from `{ requirementId: status }`, inferring levels from the scenario. */
function outcomes(entries: Record<string, 'pass' | 'fail'>): Record<string, RequirementOutcome> {
	const levels: Record<string, 'MUST' | 'SHOULD'> = { stored: 'MUST', displayed: 'SHOULD' };
	return Object.fromEntries(
		Object.entries(entries).map(([id, status]) => [
			id,
			{ requirementId: id, level: levels[id], status, source: 'attested' as const }
		])
	);
}

describe('rollUpScenario', () => {
	it('is `incomplete` while anything is unanswered', () => {
		expect(rollUpScenario(scenario, outcomes({ stored: 'pass' }))).toBe('incomplete');
	});

	it('is `incomplete` with nothing answered at all', () => {
		expect(rollUpScenario(scenario, {})).toBe('incomplete');
	});

	it('checks unanswered BEFORE failures — a run in progress is not yet a verdict', () => {
		// One failing MUST, but the SHOULD is unanswered: still in progress.
		expect(rollUpScenario(scenario, outcomes({ stored: 'fail' }))).toBe('incomplete');
	});

	it('is `failed` when a MUST fails', () => {
		expect(rollUpScenario(scenario, outcomes({ stored: 'fail', displayed: 'pass' }))).toBe(
			'failed'
		);
	});

	it('is `passed` when a SHOULD fails — recorded and shown, but it does not block', () => {
		expect(rollUpScenario(scenario, outcomes({ stored: 'pass', displayed: 'fail' }))).toBe(
			'passed'
		);
	});

	it('is `passed` when everything passes', () => {
		expect(rollUpScenario(scenario, outcomes({ stored: 'pass', displayed: 'pass' }))).toBe(
			'passed'
		);
	});

	it('is `failed` when both a MUST and a SHOULD fail', () => {
		expect(rollUpScenario(scenario, outcomes({ stored: 'fail', displayed: 'fail' }))).toBe(
			'failed'
		);
	});
});

describe('unansweredRequirements', () => {
	it('lists what the operator still has to answer', () => {
		expect(unansweredRequirements(scenario, outcomes({ stored: 'pass' })).map((r) => r.id)).toEqual(
			['displayed']
		);
	});

	it('is empty once everything is settled', () => {
		expect(
			unansweredRequirements(scenario, outcomes({ stored: 'pass', displayed: 'pass' }))
		).toEqual([]);
	});
});

describe('failingShoulds', () => {
	it('surfaces advisories separately, so “passed with two advisories” is sayable', () => {
		const found = failingShoulds(scenario, outcomes({ stored: 'pass', displayed: 'fail' }));

		expect(found.map((o) => o.requirementId)).toEqual(['displayed']);
	});

	it('never includes a failing MUST', () => {
		const found = failingShoulds(scenario, outcomes({ stored: 'fail', displayed: 'pass' }));

		expect(found).toEqual([]);
	});
});

import { describe, expect, it } from 'vitest';

import { rollUpScenario } from './roll-up.js';
import {
	answerRequirement,
	beginStep,
	currentStepId,
	failStep,
	settleStep,
	startRun,
	stepsInRunOrder
} from './run-state.js';
import {
	affirmRequirement,
	autoRequirement,
	chooseRequirement,
	discriminationScenario,
	testScenario,
	testStep
} from './test-scenario.js';

const AT = '2026-08-13T10:00:00.000Z';
const SEED = 'seed-1';

/** A completed claim exchange with a holder DID bound. */
const completeExchange = {
	stepId: 'offer',
	exchange: {
		state: 'complete' as const,
		variables: { holderDid: 'did:key:z6Mkexample' }
	}
};

describe('startRun', () => {
	it('records the fingerprint of the definition it began with', () => {
		const scenario = testScenario();
		const state = startRun(scenario, { now: AT, shuffleSeed: SEED });

		expect(state.fingerprint).toMatch(/^[0-9a-f]{8}$/);
		expect(state.scenarioSlug).toBe('oid4-wallet-acceptance');
		expect(state.attemptStartedAt).toBe(AT);
	});

	it('starts every step pending, with nothing answered', () => {
		const state = startRun(testScenario(), { now: AT, shuffleSeed: SEED });

		expect(state.steps.every((s) => s.state === 'pending')).toBe(true);
		expect(state.outcomes).toEqual({});
		expect(state.answers).toEqual({});
	});

	it('is deterministic for a given seed — time and randomness are injected', () => {
		const scenario = discriminationScenario();
		const a = startRun(scenario, { now: AT, shuffleSeed: SEED });
		const b = startRun(scenario, { now: AT, shuffleSeed: SEED });

		expect(a).toEqual(b);
	});

	it('a retry is simply another run: fresh seed, nothing carried over', () => {
		const scenario = testScenario();
		const first = startRun(scenario, { now: AT, shuffleSeed: 'a' });
		const answered = answerRequirement(scenario, first, 'stored', {
			kind: 'affirm',
			value: true
		});
		const retry = startRun(scenario, { now: '2026-08-13T11:00:00.000Z', shuffleSeed: 'b' });

		expect(answered.outcomes.stored).toBeDefined();
		expect(retry.outcomes).toEqual({});
		expect(retry.answers).toEqual({});
	});
});

describe('step lifecycle', () => {
	it('tracks the step in flight', () => {
		const state = beginStep(startRun(testScenario(), { now: AT, shuffleSeed: SEED }), 'offer');

		expect(currentStepId(state)).toBe('offer');
	});

	it('rejects a step that is not part of the run', () => {
		const state = startRun(testScenario(), { now: AT, shuffleSeed: SEED });

		expect(() => beginStep(state, 'no-such-step')).toThrow(/not part of this run/);
	});

	it('settles a step and records its evidence', () => {
		const scenario = testScenario();
		const state = settleStep(
			scenario,
			startRun(scenario, { now: AT, shuffleSeed: SEED }),
			'offer',
			completeExchange
		);

		expect(state.steps[0].state).toBe('settled');
		expect(state.evidence.steps.offer.exchange?.state).toBe('complete');
	});

	it('an errored step leaves its automatic requirements unresolved, not failed', () => {
		const scenario = testScenario();
		const state = failStep(startRun(scenario, { now: AT, shuffleSeed: SEED }), 'offer');

		// We never observed them; recording a failure we did not measure would be
		// exactly the dishonesty this design avoids.
		expect(state.outcomes).toEqual({});
		expect(rollUpScenario(scenario, state.outcomes)).toBe('incomplete');
	});
});

describe('automatic requirements resolve on settle, before anything is asked', () => {
	const scenario = testScenario({
		steps: [
			testStep({
				requirements: [
					autoRequirement(),
					autoRequirement({
						id: 'holder-bound',
						check: { kind: 'automatic', checkId: 'holder-did-bound' }
					}),
					affirmRequirement()
				]
			})
		]
	});

	it('resolves every automatic requirement the moment the step settles', () => {
		const state = settleStep(
			scenario,
			startRun(scenario, { now: AT, shuffleSeed: SEED }),
			'offer',
			completeExchange
		);

		expect(state.outcomes['exchange-complete'].status).toBe('pass');
		expect(state.outcomes['holder-bound'].status).toBe('pass');
	});

	it('leaves the attested requirement unanswered at that moment', () => {
		const state = settleStep(
			scenario,
			startRun(scenario, { now: AT, shuffleSeed: SEED }),
			'offer',
			completeExchange
		);

		// The wire truth is visible while the operator is still being asked what
		// they saw — the teaching moment the ordering exists for.
		expect(state.outcomes.stored).toBeUndefined();
		expect(rollUpScenario(scenario, state.outcomes)).toBe('incomplete');
	});

	it('marks them `automated`', () => {
		const state = settleStep(
			scenario,
			startRun(scenario, { now: AT, shuffleSeed: SEED }),
			'offer',
			completeExchange
		);

		expect(state.outcomes['exchange-complete'].source).toBe('automated');
	});

	it('fails an automatic requirement whose evidence does not support it', () => {
		const state = settleStep(
			scenario,
			startRun(scenario, { now: AT, shuffleSeed: SEED }),
			'offer',
			{ stepId: 'offer', exchange: { state: 'invalid', variables: {} } }
		);

		expect(state.outcomes['exchange-complete'].status).toBe('fail');
		expect(state.outcomes['holder-bound'].status).toBe('fail');
	});
});

describe('answering', () => {
	const scenario = testScenario({
		steps: [testStep({ requirements: [affirmRequirement(), chooseRequirement()] })]
	});
	const started = () => startRun(scenario, { now: AT, shuffleSeed: SEED });

	it('records the raw answer alongside the scored outcome', () => {
		const state = answerRequirement(scenario, started(), 'stored', {
			kind: 'affirm',
			value: true
		});

		expect(state.answers.stored).toEqual({ kind: 'affirm', value: true });
		expect(state.outcomes.stored.status).toBe('pass');
	});

	it('a wrong answer does not stop the run — the operator keeps answering', () => {
		let state = answerRequirement(scenario, started(), 'stored', { kind: 'affirm', value: false });
		state = answerRequirement(scenario, state, 'displayed', { kind: 'choose', value: 'card' });

		expect(state.outcomes.stored.status).toBe('fail');
		expect(state.outcomes.displayed.status).toBe('pass');
	});

	it('re-answering replaces the previous outcome', () => {
		let state = answerRequirement(scenario, started(), 'stored', { kind: 'affirm', value: false });
		state = answerRequirement(scenario, state, 'stored', { kind: 'affirm', value: true });

		expect(state.outcomes.stored.status).toBe('pass');
	});

	it('rejects a requirement the scenario does not have', () => {
		expect(() =>
			answerRequirement(scenario, started(), 'no-such-requirement', {
				kind: 'affirm',
				value: true
			})
		).toThrow(/has no requirement/);
	});
});

describe('stepsInRunOrder', () => {
	it('returns the definition’s steps in the run’s shuffled order', () => {
		const scenario = discriminationScenario();
		const state = startRun(scenario, { now: AT, shuffleSeed: 'order-check' });

		expect(stepsInRunOrder(scenario, state).map((s) => s.id)).toEqual(
			state.steps.map((s) => s.stepId)
		);
	});
});

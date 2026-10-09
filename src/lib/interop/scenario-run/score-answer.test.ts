import { describe, expect, it } from 'vitest';

import { emptyEvidence, withStepEvidence } from './evidence.js';
import {
	expectedAnswerFor,
	resolveAutomaticRequirement,
	scoreAttestedAnswer
} from './score-answer.js';
import { affirmRequirement, autoRequirement, chooseRequirement } from './test-scenario.js';

describe('scoreAttestedAnswer — affirm', () => {
	const requirement = affirmRequirement();

	it('passes `true`, which is always the expected answer', () => {
		expect(scoreAttestedAnswer(requirement, { kind: 'affirm', value: true }).status).toBe('pass');
	});

	it('fails `false`', () => {
		expect(scoreAttestedAnswer(requirement, { kind: 'affirm', value: false }).status).toBe('fail');
	});

	it('denormalises the expected answer so a stored run can render its own reveal', () => {
		const outcome = scoreAttestedAnswer(requirement, { kind: 'affirm', value: false });

		expect(outcome.expected).toEqual({ kind: 'affirm', value: true });
		expect(outcome.answer).toEqual({ kind: 'affirm', value: false });
	});

	it('marks the outcome `attested`', () => {
		expect(scoreAttestedAnswer(requirement, { kind: 'affirm', value: true }).source).toBe(
			'attested'
		);
	});
});

describe('scoreAttestedAnswer — choose', () => {
	const requirement = chooseRequirement();

	it('passes the authored right answer', () => {
		expect(scoreAttestedAnswer(requirement, { kind: 'choose', value: 'card' }).status).toBe('pass');
	});

	it('fails any other option', () => {
		expect(scoreAttestedAnswer(requirement, { kind: 'choose', value: 'nothing' }).status).toBe(
			'fail'
		);
	});

	it('denormalises the concealed right answer', () => {
		const outcome = scoreAttestedAnswer(requirement, { kind: 'choose', value: 'nothing' });

		expect(outcome.expected).toEqual({ kind: 'choose', value: 'card' });
	});
});

describe('scoreAttestedAnswer — cant-tell', () => {
	it('fails an affirm question — the commonest real failure mode, not a limbo state', () => {
		const outcome = scoreAttestedAnswer(affirmRequirement(), { kind: 'cant-tell' });

		expect(outcome.status).toBe('fail');
	});

	it('fails a choose question too', () => {
		expect(scoreAttestedAnswer(chooseRequirement(), { kind: 'cant-tell' }).status).toBe('fail');
	});

	it('carries no reason code — an enum of causes here would be operator guesswork', () => {
		const outcome = scoreAttestedAnswer(affirmRequirement(), { kind: 'cant-tell' });

		expect(outcome.answer).toEqual({ kind: 'cant-tell' });
		expect(Object.keys(outcome.answer!)).toEqual(['kind']);
	});

	it('still records what the right answer was, so the reveal lands', () => {
		expect(scoreAttestedAnswer(chooseRequirement(), { kind: 'cant-tell' }).expected).toEqual({
			kind: 'choose',
			value: 'card'
		});
	});
});

describe('scoreAttestedAnswer — caller errors', () => {
	it('throws when handed an automatic requirement', () => {
		expect(() => scoreAttestedAnswer(autoRequirement(), { kind: 'affirm', value: true })).toThrow(
			/is automatic/
		);
	});

	it('throws when the answer shape does not match the question', () => {
		expect(() =>
			scoreAttestedAnswer(affirmRequirement(), { kind: 'choose', value: 'card' })
		).toThrow(/asks a "affirm" question/);
	});
});

describe('expectedAnswerFor', () => {
	it('is always `true` for affirm — the definition carries no `expected` field to read', () => {
		expect(expectedAnswerFor({ kind: 'affirm' })).toEqual({ kind: 'affirm', value: true });
	});

	it('is the authored `correct` for choose', () => {
		expect(
			expectedAnswerFor({
				kind: 'choose',
				options: [
					{ value: 'a', label: 'A' },
					{ value: 'b', label: 'B' }
				],
				correct: 'b'
			})
		).toEqual({ kind: 'choose', value: 'b' });
	});
});

describe('resolveAutomaticRequirement', () => {
	const evidence = withStepEvidence(emptyEvidence(), {
		stepId: 'offer',
		exchange: { state: 'complete', variables: {} }
	});

	it('passes when the check is met', () => {
		const outcome = resolveAutomaticRequirement(autoRequirement(), 'offer', evidence);

		expect(outcome.status).toBe('pass');
		expect(outcome.source).toBe('automated');
	});

	it('carries no answer or expected — nothing was asked', () => {
		const outcome = resolveAutomaticRequirement(autoRequirement(), 'offer', evidence);

		expect(outcome.answer).toBeUndefined();
		expect(outcome.expected).toBeUndefined();
	});

	it('fails, rather than throwing, when the catalog names an unregistered check', () => {
		const requirement = autoRequirement({
			check: { kind: 'automatic', checkId: 'no-such-check' }
		});
		const outcome = resolveAutomaticRequirement(requirement, 'offer', evidence);

		expect(outcome.status).toBe('fail');
		expect(outcome.detail).toContain('no-such-check');
	});

	it('throws when handed an attested requirement', () => {
		expect(() => resolveAutomaticRequirement(affirmRequirement(), 'offer', evidence)).toThrow(
			/is attested/
		);
	});
});

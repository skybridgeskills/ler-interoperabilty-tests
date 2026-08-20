import { describe, expect, it } from 'vitest';

import { allScenarios, scenarioBySlug, validateCatalog } from './index.js';

/**
 * The two proof-of-concept scenarios. The catalog machinery is tested in
 * `catalog-validation.test.ts`; this pins the properties that make *these two*
 * the proof — most importantly that the discrimination passes are
 * indistinguishable before answering.
 */
describe('PoC scenario catalog', () => {
	it('registers the catalog scenarios and validates clean', () => {
		expect(allScenarios.map((s) => s.slug)).toEqual([
			'oid4-wallet-acceptance',
			'oid4-wallet-refusal-discrimination',
			'oid4-wallet-faithful-rendering'
		]);
		expect(validateCatalog(allScenarios)).toEqual([]);
	});
});

describe('oid4-wallet-refusal-discrimination', () => {
	const scenario = scenarioBySlug('oid4-wallet-refusal-discrimination')!;

	it('has three contiguous shuffled passes with a shuffleLabel', () => {
		expect(scenario.steps).toHaveLength(3);
		expect(scenario.steps.every((s) => s.shuffle === true)).toBe(true);
		expect(scenario.shuffleLabel).toBe('Credential');
	});

	it('makes the passes indistinguishable before answering — identical requirement shape', () => {
		const shapeOf = (step: (typeof scenario.steps)[number]) =>
			step.requirements.map((r) => ({
				level: r.level,
				kind: r.check.kind,
				answer: r.check.kind === 'attested' ? r.check.answer.kind : r.check.checkId,
				// A `choose`'s options are visible to the operator, so they must match
				// across passes too — only the concealed `correct` may differ.
				options:
					r.check.kind === 'attested' && r.check.answer.kind === 'choose'
						? r.check.answer.options.map((o) => o.value)
						: undefined,
				statement: r.statement
			}));
		const [a, b, c] = scenario.steps.map(shapeOf);
		expect(b).toEqual(a);
		expect(c).toEqual(a);
	});

	it('conceals a different right answer per pass — accept the control, refuse the rest', () => {
		const correctOf = (stepId: string) => {
			const step = scenario.steps.find((s) => s.id === stepId)!;
			const handled = step.requirements.find((r) => r.id === `${stepId}-handled`)!;
			return handled.check.kind === 'attested' && handled.check.answer.kind === 'choose'
				? handled.check.answer.correct
				: undefined;
		};
		expect(correctOf('control')).toBe('accepted');
		expect(correctOf('expired')).toBe('refused');
		expect(correctOf('tampered')).toBe('refused');
	});

	it('only the tampered pass corrupts the proof — the others deliver valid documents', () => {
		const actionOf = (id: string) => scenario.steps.find((s) => s.id === id)!.action;
		expect(actionOf('tampered')).toMatchObject({ kind: 'issue', tamper: 'proof' });
		expect(actionOf('control')).not.toHaveProperty('tamper');
		expect(actionOf('expired')).not.toHaveProperty('tamper');
	});
});

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
			'oid4-wallet-faithful-rendering',
			'ob3-direct-verifier-acceptance',
			'vcalm-verifier-delivery',
			'vcalm-verifier-acceptance',
			'oid4-verifier-delivery',
			'oid4-verifier-acceptance'
		]);
		expect(validateCatalog(allScenarios)).toEqual([]);
	});
});

describe('ob3-direct-verifier-acceptance', () => {
	const scenario = scenarioBySlug('ob3-direct-verifier-acceptance')!;

	it('has four contiguous shuffled passes with a shuffleLabel', () => {
		expect(scenario.steps).toHaveLength(4);
		expect(scenario.steps.every((s) => s.shuffle === true)).toBe(true);
		expect(scenario.shuffleLabel).toBe('Credential');
	});

	it('is a verifier scenario required in its base profile', () => {
		expect(scenario.role).toBe('verifier');
		expect(scenario.memberships).toEqual([{ profile: 'ob3-direct-delivery', level: 'required' }]);
	});

	it('makes the passes indistinguishable before answering — identical requirement shape', () => {
		const shapeOf = (step: (typeof scenario.steps)[number]) =>
			step.requirements.map((r) => ({
				level: r.level,
				kind: r.check.kind,
				answer: r.check.kind === 'attested' ? r.check.answer.kind : r.check.checkId,
				// The operator sees the options, so they must match across passes too —
				// only the concealed `correct` may differ.
				options:
					r.check.kind === 'attested' && r.check.answer.kind === 'choose'
						? r.check.answer.options.map((o) => o.value)
						: undefined,
				statement: r.statement
			}));
		const [a, ...rest] = scenario.steps.map(shapeOf);
		for (const other of rest) expect(other).toEqual(a);
	});

	it('scores verdict as MUST and reason as SHOULD on every pass', () => {
		for (const step of scenario.steps) {
			const verdict = step.requirements.find((r) => r.id === `${step.id}-verdict`)!;
			const reason = step.requirements.find((r) => r.id === `${step.id}-reason`)!;
			expect(verdict.level).toBe('MUST');
			expect(reason.level).toBe('SHOULD');
		}
	});

	it('conceals the right verdict and reason per pass; `other` is never correct', () => {
		const correctOf = (stepId: string, kind: 'verdict' | 'reason') => {
			const step = scenario.steps.find((s) => s.id === stepId)!;
			const req = step.requirements.find((r) => r.id === `${stepId}-${kind}`)!;
			return req.check.kind === 'attested' && req.check.answer.kind === 'choose'
				? req.check.answer.correct
				: undefined;
		};
		expect(correctOf('valid', 'verdict')).toBe('accepted');
		expect(correctOf('valid', 'reason')).toBe('none');
		expect(correctOf('broken-signature', 'verdict')).toBe('rejected');
		expect(correctOf('broken-signature', 'reason')).toBe('signature');
		expect(correctOf('schema-problem', 'reason')).toBe('schema');
		expect(correctOf('expired', 'reason')).toBe('expiry');
		// `other` and `cant-tell` can never be the concealed right answer.
		for (const step of scenario.steps) {
			expect(correctOf(step.id, 'reason')).not.toBe('other');
		}
	});

	it('only the broken-signature pass corrupts the proof; each pass uses its recipe', () => {
		const actionOf = (id: string) => scenario.steps.find((s) => s.id === id)!.action;
		expect(actionOf('valid')).toEqual({ kind: 'deliver-direct', credential: 'minimal-ob3' });
		expect(actionOf('broken-signature')).toMatchObject({ tamper: 'proof' });
		expect(actionOf('schema-problem')).toEqual({
			kind: 'deliver-direct',
			credential: 'schema-invalid-ob3'
		});
		expect(actionOf('expired')).toEqual({ kind: 'deliver-direct', credential: 'ob3-expired' });
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

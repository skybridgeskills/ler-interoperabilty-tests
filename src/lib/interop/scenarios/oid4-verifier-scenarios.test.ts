import { describe, expect, it } from 'vitest';

import { checkById } from '$lib/interop/scenario-run/index.js';

import { validateCatalog } from './catalog-validation.js';

import { scenarioBySlug } from './index.js';

/**
 * The two OID4VP verifier scenarios (M10b): a pure-automatic **delivery** floor
 * probe and an attested **acceptance** discrimination, both live over the
 * `present-to-verifier` transport with `transport: 'oid4vp'`.
 */

describe('oid4-verifier-delivery', () => {
	const scenario = scenarioBySlug('oid4-verifier-delivery')!;

	it('is a pure-automatic single-step verifier scenario, required in oid4', () => {
		expect(scenario.role).toBe('verifier');
		expect(scenario.workflow).toBe('credential-request-and-verification');
		expect(scenario.memberships).toEqual([{ profile: 'oid4', level: 'required' }]);
		expect(scenario.steps).toHaveLength(1);
		const [step] = scenario.steps;
		expect(step.shuffle).toBeUndefined();
		// Pure-automatic: every requirement is an automatic check (no attested question).
		expect(step.requirements.every((r) => r.check.kind === 'automatic')).toBe(true);
	});

	it('scores request-tls as SHOULD and every other floor/delivery row as MUST', () => {
		const [step] = scenario.steps;
		const levelOf = (id: string) => step.requirements.find((r) => r.id === id)!.level;
		expect(levelOf('request-tls')).toBe('SHOULD');
		for (const id of [
			'request-endpoint',
			'request-matchable',
			'request-di-vp-format',
			'response-tls',
			'response-endpoint'
		]) {
			expect(levelOf(id), id).toBe('MUST');
		}
	});

	it('presents a valid credential and names the six registered floor/delivery checks', () => {
		const [step] = scenario.steps;
		expect(step.action).toEqual({
			kind: 'present-to-verifier',
			credential: 'minimal-ob3',
			transport: 'oid4vp'
		});
		const checkIds = step.requirements.map((r) =>
			r.check.kind === 'automatic' ? r.check.checkId : undefined
		);
		expect(checkIds).toEqual([
			'oid4-request-endpoint',
			'oid4-request-matchable',
			'oid4-request-di-vp-format',
			'oid4-request-tls',
			'oid4-response-tls',
			'oid4-response-endpoint'
		]);
		// Every named check resolves in the registry — no dangling authored ids.
		for (const id of checkIds) expect(checkById(id!)).toBeDefined();
	});
});

describe('oid4-verifier-acceptance', () => {
	const scenario = scenarioBySlug('oid4-verifier-acceptance')!;

	it('has four contiguous shuffled passes with a shuffleLabel', () => {
		expect(scenario.steps).toHaveLength(4);
		expect(scenario.steps.every((s) => s.shuffle === true)).toBe(true);
		expect(scenario.shuffleLabel).toBe('Credential');
		expect(scenario.memberships).toEqual([{ profile: 'oid4', level: 'required' }]);
	});

	it('presents each pass over oid4vp; only broken-signature tampers the proof', () => {
		const actionOf = (id: string) => scenario.steps.find((s) => s.id === id)!.action;
		expect(actionOf('valid')).toEqual({
			kind: 'present-to-verifier',
			credential: 'minimal-ob3',
			transport: 'oid4vp'
		});
		expect(actionOf('broken-signature')).toMatchObject({
			kind: 'present-to-verifier',
			transport: 'oid4vp',
			tamper: 'proof'
		});
		expect(actionOf('schema-problem')).toEqual({
			kind: 'present-to-verifier',
			credential: 'schema-invalid-ob3',
			transport: 'oid4vp'
		});
		expect(actionOf('expired')).toEqual({
			kind: 'present-to-verifier',
			credential: 'ob3-expired',
			transport: 'oid4vp'
		});
	});

	it('makes the passes indistinguishable — identical requirement shape, no scored automatic', () => {
		const shapeOf = (step: (typeof scenario.steps)[number]) =>
			step.requirements.map((r) => ({
				level: r.level,
				kind: r.check.kind,
				answer: r.check.kind === 'attested' ? r.check.answer.kind : r.check.checkId,
				options:
					r.check.kind === 'attested' && r.check.answer.kind === 'choose'
						? r.check.answer.options.map((o) => o.value)
						: undefined,
				statement: r.statement
			}));
		const [a, ...rest] = scenario.steps.map(shapeOf);
		for (const other of rest) expect(other).toEqual(a);
		// No automatic check on a pass — the present is a precondition, not scored.
		for (const step of scenario.steps) {
			expect(step.requirements.every((r) => r.check.kind === 'attested')).toBe(true);
		}
	});

	it('scores verdict as MUST and reason as SHOULD, concealing the right answer; `other` never correct', () => {
		const correctOf = (stepId: string, kind: 'verdict' | 'reason') => {
			const step = scenario.steps.find((s) => s.id === stepId)!;
			const req = step.requirements.find((r) => r.id === `${stepId}-${kind}`)!;
			return req.check.kind === 'attested' && req.check.answer.kind === 'choose'
				? req.check.answer.correct
				: undefined;
		};
		for (const step of scenario.steps) {
			const verdict = step.requirements.find((r) => r.id === `${step.id}-verdict`)!;
			const reason = step.requirements.find((r) => r.id === `${step.id}-reason`)!;
			expect(verdict.level).toBe('MUST');
			expect(reason.level).toBe('SHOULD');
			expect(correctOf(step.id, 'reason')).not.toBe('other');
		}
		expect(correctOf('valid', 'verdict')).toBe('accepted');
		expect(correctOf('valid', 'reason')).toBe('none');
		expect(correctOf('broken-signature', 'reason')).toBe('signature');
		expect(correctOf('schema-problem', 'reason')).toBe('schema');
		expect(correctOf('expired', 'reason')).toBe('expiry');
	});
});

describe('the catalog with the oid4 verifier scenarios', () => {
	it('validates clean', () => {
		expect(validateCatalog([scenarioBySlug('oid4-verifier-delivery')!])).toEqual([]);
		expect(validateCatalog([scenarioBySlug('oid4-verifier-acceptance')!])).toEqual([]);
	});
});

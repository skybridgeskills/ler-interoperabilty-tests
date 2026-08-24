import { describe, expect, it } from 'vitest';

import { scenarioFingerprint } from './scenario-fingerprint.js';
import { Scenario, type ScenarioStep } from './scenario-schema.js';

/** A two-step scenario exercising both check kinds and both answer kinds. */
function baseScenario(): Scenario {
	return Scenario({
		slug: 'oid4-wallet-acceptance',
		name: 'Accept a well-formed credential',
		blurb: 'The happy path.',
		role: 'wallet',
		workflow: 'credential-acceptance',
		memberships: [{ profile: 'oid4', level: 'required' }],
		steps: [
			{
				id: 'offer',
				title: 'Offer the credential',
				summary: 'We will issue your wallet an Open Badges credential.',
				action: { kind: 'issue', credential: 'minimal-ob3' },
				requirements: [
					{
						id: 'exchange-complete',
						statement: 'The exchange completed.',
						level: 'MUST',
						check: { kind: 'automatic', checkId: 'exchange-reached-complete' }
					},
					{
						id: 'stored',
						statement: 'The credential appears in your wallet’s list.',
						level: 'MUST',
						check: { kind: 'attested', answer: { kind: 'affirm' } }
					}
				]
			},
			{
				id: 'debrief',
				title: 'Debrief',
				summary: 'A question about what you saw.',
				requirements: [
					{
						id: 'displayed',
						statement: 'What did your wallet display?',
						level: 'SHOULD',
						check: {
							kind: 'attested',
							answer: {
								kind: 'choose',
								options: [
									{ value: 'nothing', label: 'Nothing' },
									{ value: 'card', label: 'A rendered card' }
								],
								correct: 'card'
							}
						}
					}
				]
			}
		]
	});
}

/** Rebuild a scenario with one step replaced, keeping it schema-valid. */
function withStep(scenario: Scenario, index: number, step: ScenarioStep): Scenario {
	const steps = scenario.steps.map((s, i) => (i === index ? step : s));
	return Scenario({ ...scenario, steps });
}

describe('scenarioFingerprint', () => {
	it('is deterministic: same input → same output across calls', () => {
		expect(scenarioFingerprint(baseScenario())).toBe(scenarioFingerprint(baseScenario()));
	});

	it('returns a zero-padded 8-hex-digit string', () => {
		expect(scenarioFingerprint(baseScenario())).toMatch(/^[0-9a-f]{8}$/);
	});

	describe('excludes cosmetic fields, so copy-editing never costs anyone their results', () => {
		const base = baseScenario();
		const expected = scenarioFingerprint(base);

		it('ignores the scenario name', () => {
			expect(scenarioFingerprint(Scenario({ ...base, name: 'Something else' }))).toBe(expected);
		});

		it('ignores the scenario blurb', () => {
			expect(scenarioFingerprint(Scenario({ ...base, blurb: 'Reworded blurb.' }))).toBe(expected);
		});

		it('ignores a step summary', () => {
			const step = { ...base.steps[0], summary: 'Completely reworded setup copy.' };
			expect(scenarioFingerprint(withStep(base, 0, step))).toBe(expected);
		});

		it('ignores a step title', () => {
			const step = { ...base.steps[0], title: 'Offer it' };
			expect(scenarioFingerprint(withStep(base, 0, step))).toBe(expected);
		});

		it('ignores shuffleLabel — a presentation field, so renaming it costs nobody', () => {
			expect(scenarioFingerprint(Scenario({ ...base, shuffleLabel: 'Credential' }))).toBe(expected);
			expect(scenarioFingerprint(Scenario({ ...base, shuffleLabel: 'Pass' }))).toBe(expected);
		});

		it('ignores a step id, since nothing persisted keys on one', () => {
			const step = { ...base.steps[0], id: 'step-1' };
			expect(scenarioFingerprint(withStep(base, 0, step))).toBe(expected);
		});
	});

	describe('includes everything a result is scored against', () => {
		const base = baseScenario();
		const expected = scenarioFingerprint(base);

		it('changes when a requirement id changes', () => {
			const requirements = [
				{ ...base.steps[0].requirements[0], id: 'exchange-settled' },
				base.steps[0].requirements[1]
			];
			const step = { ...base.steps[0], requirements };
			expect(scenarioFingerprint(withStep(base, 0, step))).not.toBe(expected);
		});

		it('changes when a requirement level changes', () => {
			const requirements = [
				base.steps[0].requirements[0],
				{ ...base.steps[0].requirements[1], level: 'SHOULD' as const }
			];
			const step = { ...base.steps[0], requirements };
			expect(scenarioFingerprint(withStep(base, 0, step))).not.toBe(expected);
		});

		it('changes when a requirement statement changes', () => {
			const requirements = [
				base.steps[0].requirements[0],
				{ ...base.steps[0].requirements[1], statement: 'The credential was stored.' }
			];
			const step = { ...base.steps[0], requirements };
			expect(scenarioFingerprint(withStep(base, 0, step))).not.toBe(expected);
		});

		it('changes when an automatic checkId changes', () => {
			const requirements = [
				{
					...base.steps[0].requirements[0],
					check: { kind: 'automatic' as const, checkId: 'offer-was-fetched' }
				},
				base.steps[0].requirements[1]
			];
			const step = { ...base.steps[0], requirements };
			expect(scenarioFingerprint(withStep(base, 0, step))).not.toBe(expected);
		});

		it('changes when a choose right answer changes — the dishonest-drift case', () => {
			const requirement = base.steps[1].requirements[0];
			const answer = {
				...requirement.check,
				answer: {
					kind: 'choose' as const,
					options: [
						{ value: 'nothing', label: 'Nothing' },
						{ value: 'card', label: 'A rendered card' }
					],
					correct: 'nothing'
				}
			};
			const step = { ...base.steps[1], requirements: [{ ...requirement, check: answer }] };
			expect(scenarioFingerprint(withStep(base, 1, step))).not.toBe(expected);
		});

		it('changes when a choose option label changes', () => {
			const requirement = base.steps[1].requirements[0];
			const check = {
				kind: 'attested' as const,
				answer: {
					kind: 'choose' as const,
					options: [
						{ value: 'nothing', label: 'Nothing at all' },
						{ value: 'card', label: 'A rendered card' }
					],
					correct: 'card'
				}
			};
			const step = { ...base.steps[1], requirements: [{ ...requirement, check }] };
			expect(scenarioFingerprint(withStep(base, 1, step))).not.toBe(expected);
		});

		it('changes when a step action changes', () => {
			const step = {
				...base.steps[0],
				action: { kind: 'issue' as const, credential: 'minimal-ob3', tamper: 'proof' as const }
			};
			expect(scenarioFingerprint(withStep(base, 0, step))).not.toBe(expected);
		});

		it('changes when a step becomes shuffled', () => {
			const step = { ...base.steps[0], shuffle: true as const };
			expect(scenarioFingerprint(withStep(base, 0, step))).not.toBe(expected);
		});

		it('is order-dependent: reordering steps changes the fingerprint', () => {
			const reordered = Scenario({ ...base, steps: [base.steps[1], base.steps[0]] });
			expect(scenarioFingerprint(reordered)).not.toBe(expected);
		});

		it('is order-dependent: reordering requirements changes the fingerprint', () => {
			const step = {
				...base.steps[0],
				requirements: [base.steps[0].requirements[1], base.steps[0].requirements[0]]
			};
			expect(scenarioFingerprint(withStep(base, 0, step))).not.toBe(expected);
		});
	});

	it('does not depend on the order an action’s fields were authored in', () => {
		const authoredOneWay = Scenario({
			...baseScenario(),
			steps: [
				{
					...baseScenario().steps[0],
					action: {
						kind: 'issue',
						credential: 'minimal-ob3',
						intent: { cryptosuite: 'eddsa-rdfc-2022', didMethod: 'key' }
					}
				},
				baseScenario().steps[1]
			]
		});
		const authoredTheOther = Scenario({
			...baseScenario(),
			steps: [
				{
					...baseScenario().steps[0],
					action: {
						kind: 'issue',
						intent: { didMethod: 'key', cryptosuite: 'eddsa-rdfc-2022' },
						credential: 'minimal-ob3'
					}
				},
				baseScenario().steps[1]
			]
		});
		expect(scenarioFingerprint(authoredOneWay)).toBe(scenarioFingerprint(authoredTheOther));
	});
});

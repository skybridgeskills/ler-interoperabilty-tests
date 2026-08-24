import { Requirement, Scenario, ScenarioStep } from '$lib/interop/scenarios/index.js';

/**
 * Builders for scenarios the run-engine tests exercise. Kept beside the code
 * rather than duplicated across four test files; nothing in `src/` imports
 * them, so they never reach a bundle.
 */

type ScenarioInput = Parameters<typeof Scenario>[0];
type StepInput = Parameters<typeof ScenarioStep>[0];
type RequirementInput = Parameters<typeof Requirement>[0];

/** An automatic MUST, defaulting to the exchange-completed check. */
export function autoRequirement(over: Partial<RequirementInput> = {}): Requirement {
	return Requirement({
		id: 'exchange-complete',
		statement: 'The exchange completed.',
		level: 'MUST',
		check: { kind: 'automatic', checkId: 'exchange-reached-complete' },
		...over
	});
}

/** An attested MUST asking a true/false question. */
export function affirmRequirement(over: Partial<RequirementInput> = {}): Requirement {
	return Requirement({
		id: 'stored',
		statement: 'The credential appears in your wallet’s list.',
		level: 'MUST',
		check: { kind: 'attested', answer: { kind: 'affirm' } },
		...over
	});
}

/** An attested SHOULD asking a one-of-N question; `card` is the right answer. */
export function chooseRequirement(over: Partial<RequirementInput> = {}): Requirement {
	return Requirement({
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
		},
		...over
	});
}

export function testStep(over: Partial<StepInput> = {}): ScenarioStep {
	return ScenarioStep({
		id: 'offer',
		title: 'Offer the credential',
		summary: 'We will issue your wallet a credential.',
		action: { kind: 'issue', credential: 'minimal-ob3' },
		requirements: [autoRequirement(), affirmRequirement()],
		...over
	});
}

export function testScenario(over: Partial<ScenarioInput> = {}): Scenario {
	return Scenario({
		slug: 'oid4-wallet-acceptance',
		name: 'Accept a well-formed credential',
		blurb: 'The happy path.',
		role: 'wallet',
		workflow: 'credential-acceptance',
		memberships: [{ profile: 'oid4', level: 'required' }],
		steps: [testStep()],
		...over
	});
}

/** A three-pass discrimination scenario: contiguous shuffled steps, one requirement each. */
export function discriminationScenario(): Scenario {
	const pass = (id: string) =>
		testStep({
			id,
			shuffle: true,
			requirements: [affirmRequirement({ id: `${id}-refused` })]
		});
	return testScenario({
		slug: 'oid4-wallet-refusal-discrimination',
		steps: [pass('control'), pass('expired'), pass('tampered')]
	});
}

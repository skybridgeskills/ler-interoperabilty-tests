import { describe, expect, it } from 'vitest';

import { assertValidCatalog, validateCatalog } from './catalog-validation.js';
import { Requirement } from './requirement-schema.js';
import { Scenario, ScenarioStep } from './scenario-schema.js';

type ScenarioInput = Parameters<typeof Scenario>[0];
type StepInput = Parameters<typeof ScenarioStep>[0];
type RequirementInput = Parameters<typeof Requirement>[0];

function requirement(over: Partial<RequirementInput> = {}): Requirement {
	return Requirement({
		id: 'exchange-complete',
		statement: 'The exchange completed.',
		level: 'MUST',
		check: { kind: 'automatic', checkId: 'exchange-reached-complete' },
		...over
	});
}

function step(over: Partial<StepInput> = {}): ScenarioStep {
	return ScenarioStep({
		id: 'offer',
		title: 'Offer the credential',
		summary: 'We will issue your wallet a credential.',
		action: { kind: 'issue', credential: 'minimal-ob3' },
		requirements: [requirement()],
		...over
	});
}

function scenario(over: Partial<ScenarioInput> = {}): Scenario {
	return Scenario({
		slug: 'oid4-wallet-acceptance',
		name: 'Accept a well-formed credential',
		blurb: 'The happy path.',
		role: 'wallet',
		workflow: 'credential-acceptance',
		memberships: [{ profile: 'oid4', level: 'required' }],
		steps: [step()],
		...over
	});
}

/** The codes reported for a catalog, for terse assertions. */
const codes = (catalog: Scenario[]) => validateCatalog(catalog).map((v) => v.code);

describe('validateCatalog', () => {
	it('accepts an empty catalog', () => {
		expect(validateCatalog([])).toEqual([]);
	});

	it('accepts a well-formed catalog', () => {
		expect(validateCatalog([scenario()])).toEqual([]);
	});

	describe('rule 1 — scenario slugs are unique', () => {
		it('rejects two scenarios sharing a slug', () => {
			const catalog = [scenario(), scenario({ name: 'A different name' })];
			expect(codes(catalog)).toContain('duplicate-scenario-slug');
		});

		it('accepts distinct slugs', () => {
			const catalog = [scenario(), scenario({ slug: 'oid4-wallet-refusal-discrimination' })];
			expect(codes(catalog)).not.toContain('duplicate-scenario-slug');
		});
	});

	describe('rule 2 — step ids are unique within a scenario', () => {
		it('rejects a repeated step id', () => {
			const catalog = [scenario({ steps: [step(), step({ title: 'Offer it again' })] })];
			expect(codes(catalog)).toContain('duplicate-step-id');
		});
	});

	describe('rule 3 — requirement ids are unique within a scenario', () => {
		it('rejects a repeated requirement id across steps', () => {
			const catalog = [
				scenario({
					steps: [step(), step({ id: 'second', requirements: [requirement()] })]
				})
			];
			expect(codes(catalog)).toContain('duplicate-requirement-id');
		});

		it('rejects a repeated requirement id within one step', () => {
			const catalog = [
				scenario({ steps: [step({ requirements: [requirement(), requirement()] })] })
			];
			expect(codes(catalog)).toContain('duplicate-requirement-id');
		});
	});

	describe('rule 4 — exactly one membership names a base profile', () => {
		it('rejects a scenario naming no base profile', () => {
			const catalog = [
				scenario({ memberships: [{ profile: 'data-integrity-cryptosuites', level: 'required' }] })
			];
			expect(codes(catalog)).toContain('base-membership-count');
		});

		it('rejects a scenario naming two base profiles — cross-profile is not expressible', () => {
			const catalog = [
				scenario({
					memberships: [
						{ profile: 'oid4', level: 'required' },
						{ profile: 'vcalm', level: 'required' }
					]
				})
			];
			expect(codes(catalog)).toContain('base-membership-count');
		});

		it('accepts one base profile alongside any number of additives', () => {
			const catalog = [
				scenario({
					memberships: [
						{ profile: 'oid4', level: 'optional' },
						{ profile: 'data-integrity-cryptosuites', level: 'required' },
						{ profile: 'open-skill-alignment', level: 'optional' }
					]
				})
			];
			expect(codes(catalog)).not.toContain('base-membership-count');
		});
	});

	describe('rule 5 — oneOf members declare identical requirement ids', () => {
		const eddsa = scenario({
			slug: 'oid4-issue-eddsa',
			memberships: [
				{ profile: 'oid4', level: 'required' },
				{ profile: 'data-integrity-cryptosuites', level: { oneOf: 'producer-floor' } }
			]
		});

		it('rejects members whose requirement ids differ', () => {
			const ecdsa = scenario({
				slug: 'oid4-issue-ecdsa',
				memberships: [
					{ profile: 'oid4', level: 'required' },
					{ profile: 'data-integrity-cryptosuites', level: { oneOf: 'producer-floor' } }
				],
				steps: [step({ requirements: [requirement({ id: 'something-else' })] })]
			});
			expect(codes([eddsa, ecdsa])).toContain('one-of-requirement-mismatch');
		});

		it('accepts members declaring the same requirement ids', () => {
			const ecdsa = scenario({
				slug: 'oid4-issue-ecdsa',
				memberships: [
					{ profile: 'oid4', level: 'required' },
					{ profile: 'data-integrity-cryptosuites', level: { oneOf: 'producer-floor' } }
				]
			});
			expect(codes([eddsa, ecdsa])).not.toContain('one-of-requirement-mismatch');
		});

		it('ignores requirement order — the ids are a set, not a sequence', () => {
			const two = [requirement(), requirement({ id: 'holder-bound' })];
			const forwards = scenario({
				slug: 'oid4-issue-eddsa',
				memberships: [
					{ profile: 'oid4', level: 'required' },
					{ profile: 'data-integrity-cryptosuites', level: { oneOf: 'producer-floor' } }
				],
				steps: [step({ requirements: two })]
			});
			const backwards = scenario({
				slug: 'oid4-issue-ecdsa',
				memberships: [
					{ profile: 'oid4', level: 'required' },
					{ profile: 'data-integrity-cryptosuites', level: { oneOf: 'producer-floor' } }
				],
				steps: [step({ requirements: [two[1], two[0]] })]
			});
			expect(codes([forwards, backwards])).not.toContain('one-of-requirement-mismatch');
		});

		it('does not compare members of different groups', () => {
			const other = scenario({
				slug: 'oid4-issue-bbs',
				memberships: [
					{ profile: 'oid4', level: 'required' },
					{ profile: 'data-integrity-cryptosuites', level: { oneOf: 'selective-disclosure' } }
				],
				steps: [step({ requirements: [requirement({ id: 'something-else' })] })]
			});
			expect(codes([eddsa, other])).not.toContain('one-of-requirement-mismatch');
		});
	});

	describe('rule 6 — a choose answer’s correct is one of its options', () => {
		const chooseRequirement = (correct: string) =>
			requirement({
				id: 'displayed',
				statement: 'What did your wallet display?',
				check: {
					kind: 'attested',
					answer: {
						kind: 'choose',
						options: [
							{ value: 'nothing', label: 'Nothing' },
							{ value: 'card', label: 'A rendered card' }
						],
						correct
					}
				}
			});

		it('rejects a correct value that is not an option', () => {
			const catalog = [scenario({ steps: [step({ requirements: [chooseRequirement('error')] })] })];
			expect(codes(catalog)).toContain('choose-correct-not-an-option');
		});

		it('accepts a correct value that is an option', () => {
			const catalog = [scenario({ steps: [step({ requirements: [chooseRequirement('card')] })] })];
			expect(codes(catalog)).not.toContain('choose-correct-not-an-option');
		});
	});

	describe('rule 7 — shuffled steps are contiguous', () => {
		const shuffled = (id: string) =>
			step({ id, shuffle: true, requirements: [requirement({ id })] });
		const plain = (id: string) => step({ id, requirements: [requirement({ id })] });

		it('accepts one contiguous run of shuffled steps', () => {
			const catalog = [
				scenario({ steps: [shuffled('a'), shuffled('b'), shuffled('c'), plain('debrief')] })
			];
			expect(codes(catalog)).not.toContain('discontiguous-shuffle');
		});

		it('accepts a single shuffled step — it simply permutes with itself', () => {
			const catalog = [scenario({ steps: [plain('setup'), shuffled('a'), plain('debrief')] })];
			expect(codes(catalog)).not.toContain('discontiguous-shuffle');
		});

		it('rejects two disjoint runs of shuffled steps', () => {
			const catalog = [scenario({ steps: [shuffled('a'), plain('interlude'), shuffled('b')] })];
			expect(codes(catalog)).toContain('discontiguous-shuffle');
		});
	});

	it('reports every violation, not just the first', () => {
		const broken = scenario({
			memberships: [{ profile: 'data-integrity-cryptosuites', level: 'required' }],
			steps: [step(), step({ title: 'Again' })]
		});
		const found = codes([broken, broken]);
		expect(found).toContain('duplicate-scenario-slug');
		expect(found).toContain('duplicate-step-id');
		expect(found).toContain('duplicate-requirement-id');
		expect(found).toContain('base-membership-count');
	});
});

describe('assertValidCatalog', () => {
	it('does not throw for a valid catalog', () => {
		expect(() => assertValidCatalog([scenario()])).not.toThrow();
	});

	it('throws for a oneOf group whose members declare different requirement ids', () => {
		const memberships = [
			{ profile: 'oid4' as const, level: { oneOf: 'producer-floor' } },
			{ profile: 'data-integrity-cryptosuites' as const, level: 'required' as const }
		];
		const a = scenario({ slug: 'oid4-issue-eddsa', memberships });
		const b = scenario({
			slug: 'oid4-issue-ecdsa',
			memberships,
			steps: [step({ requirements: [requirement({ id: 'something-else' })] })]
		});
		expect(() => assertValidCatalog([a, b])).toThrow(/one-of-requirement-mismatch/);
	});

	it('names every violation in the message', () => {
		const catalog = [scenario(), scenario()];
		expect(() => assertValidCatalog(catalog)).toThrow(/1 violation\(s\)/);
	});
});

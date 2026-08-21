import { describe, expect, it } from 'vitest';

import { completeTotals, evaluateCompletion, scenarioOf } from '$lib/interop/completion/index.js';
import { checkById, type ScenarioRunRecord } from '$lib/interop/scenario-run/index.js';

import { validateCatalog } from './catalog-validation.js';
import { scenarioFingerprint } from './scenario-fingerprint.js';

import { allScenarios, scenarioBySlug } from './index.js';

/**
 * The three `*-issuer-skills-data` scenarios (M11 P6) and the
 * `osa-issuer-payload` group they share — the additive's first real scoring.
 */

const SLUGS = [
	'ob3-direct-issuer-skills-data',
	'vcalm-issuer-skills-data',
	'oid4-issuer-skills-data'
] as const;

/** A record marking every requirement of a scenario passed. */
function fullRun(slug: string): ScenarioRunRecord {
	const scenario = scenarioBySlug(slug)!;
	return {
		scenarioSlug: slug,
		ranAt: '2026-08-21T00:00:00.000Z',
		fingerprint: scenarioFingerprint(scenario),
		status: 'passed',
		attempts: 1,
		outcomes: Object.fromEntries(
			scenario.steps.flatMap((step) =>
				step.requirements.map((r) => [
					r.id,
					{
						requirementId: r.id,
						level: r.level,
						status: 'pass' as const,
						source: 'automated' as const
					}
				])
			)
		)
	};
}

describe('the three *-issuer-skills-data scenarios', () => {
	it('are all registered issuer scenarios', () => {
		for (const slug of SLUGS) {
			const scenario = scenarioBySlug(slug);
			expect(scenario, slug).toBeDefined();
			expect(scenario!.role, slug).toBe('issuer');
			expect(scenario!.steps, slug).toHaveLength(1);
		}
	});

	it('are `additive-only` in their base profile and `{oneOf}` in open-skill-alignment', () => {
		for (const slug of SLUGS) {
			const scenario = scenarioBySlug(slug)!;
			const base = scenario.memberships.find((m) => m.profile !== 'open-skill-alignment')!;
			const osa = scenario.memberships.find((m) => m.profile === 'open-skill-alignment')!;
			// The base names the scenario because it is the protocol it runs over, and
			// claims none of it — so neither the Essential meter nor the cumulative
			// Complete meter moves. `optional` would put add-on work into Complete.
			expect(base.level, slug).toBe('additive-only');
			expect(osa.level, slug).toEqual({ oneOf: 'osa-issuer-payload' });
		}
	});

	it('name each base profile exactly once, across the right workflows', () => {
		expect(
			SLUGS.map((slug) => {
				const scenario = scenarioBySlug(slug)!;
				return `${scenario.memberships[0].profile}:${scenario.workflow}`;
			})
		).toEqual([
			'ob3-direct-delivery:direct-credential-issuance',
			'vcalm:credential-issuance',
			'oid4:credential-issuance'
		]);
	});

	it('use the same `receive-from-issuer` action as their base sibling', () => {
		expect(scenarioBySlug(SLUGS[0])!.steps[0].action).toEqual({
			kind: 'receive-from-issuer',
			transport: 'direct'
		});
		expect(scenarioBySlug(SLUGS[1])!.steps[0].action).toEqual(
			scenarioBySlug('vcalm-issuer-issuance')!.steps[0].action
		);
		expect(scenarioBySlug(SLUGS[2])!.steps[0].action).toEqual(
			scenarioBySlug('oid4-issuer-issuance')!.steps[0].action
		);
	});

	it('declare identical requirement ids — catalog rule 5, asserted by name so a failure says which group', () => {
		const idsOf = (slug: string) => scenarioBySlug(slug)!.steps[0].requirements.map((r) => r.id);
		const expected = [
			'result-description-present',
			'recognized-result-type',
			'percent-value-range',
			'rubric-levels-present',
			'ctdl-alignment',
			'result-present',
			'result-links-description',
			'numeric-value-in-range',
			'achieved-level-matches'
		];
		for (const slug of SLUGS) expect(idsOf(slug), `osa-issuer-payload / ${slug}`).toEqual(expected);
	});

	it('name nine registered checks, and only `ctdl-alignment` is a SHOULD', () => {
		for (const slug of SLUGS) {
			const requirements = scenarioBySlug(slug)!.steps[0].requirements;
			for (const requirement of requirements) {
				expect(requirement.check.kind).toBe('automatic');
				if (requirement.check.kind === 'automatic') {
					expect(checkById(requirement.check.checkId), requirement.check.checkId).toBeDefined();
				}
			}
			expect(requirements.filter((r) => r.level === 'SHOULD').map((r) => r.id)).toEqual([
				'ctdl-alignment'
			]);
		}
	});

	it('keeps the whole catalog valid, including rule 5 on the group', () => {
		expect(validateCatalog(allScenarios)).toEqual([]);
	});
});

describe('the osa-issuer-payload obligation', () => {
	it('reads as one obligation before anything is run', () => {
		const result = evaluateCompletion({
			profile: 'open-skill-alignment',
			role: 'issuer',
			runs: {}
		});
		// One obligation, nine requirements — the group contributes its id set
		// once, not once per member (evaluate.ts rule 2).
		expect(result.obligations).toHaveLength(1);
		expect(result.obligations[0].obligation.kind).toBe('oneOf');
		expect(result.total).toBe(9);
		expect(result.met).toBe(0);
	});

	it('is met by one passing member, whichever protocol it was', () => {
		for (const slug of SLUGS) {
			const result = evaluateCompletion({
				profile: 'open-skill-alignment',
				role: 'issuer',
				runs: { [slug]: fullRun(slug) }
			});
			expect(result.obligations, slug).toHaveLength(1);
			expect(result.total, slug).toBe(9);
			expect(result.met, slug).toBe(9);
		}
	});

	it('does not count three times when every member passes', () => {
		const result = evaluateCompletion({
			profile: 'open-skill-alignment',
			role: 'issuer',
			runs: Object.fromEntries(SLUGS.map((slug) => [slug, fullRun(slug)]))
		});
		expect(result.obligations).toHaveLength(1);
		expect(result.total).toBe(9);
		expect(result.met).toBe(9);
	});

	it('names all three scenarios as members of the one group', () => {
		const [progress] = evaluateCompletion({
			profile: 'open-skill-alignment',
			role: 'issuer',
			runs: {}
		}).obligations;
		expect(progress.obligation.kind).toBe('oneOf');
		if (progress.obligation.kind === 'oneOf') {
			expect(progress.obligation.group).toBe('osa-issuer-payload');
			expect(progress.obligation.members.map((m) => m.slug).sort()).toEqual([...SLUGS].sort());
		}
	});

	it('leaves each base profile’s Essential *and* Complete meters untouched', () => {
		const bases = [
			{ profile: 'ob3-direct-delivery', slug: SLUGS[0] },
			{ profile: 'vcalm', slug: SLUGS[1] },
			{ profile: 'oid4', slug: SLUGS[2] }
		] as const;
		for (const { profile, slug } of bases) {
			const before = evaluateCompletion({ profile, role: 'issuer', runs: {} });
			const after = evaluateCompletion({
				profile,
				role: 'issuer',
				runs: { [slug]: fullRun(slug) }
			});
			expect(after.total, profile).toBe(before.total);
			expect(completeTotals(after), profile).toEqual(completeTotals(before));
			// The scenario is in neither bucket at all — that is what `additive-only` means.
			expect(
				after.optional.obligations.map((o) => scenarioOf(o).slug),
				profile
			).not.toContain(slug);
		}
	});
});

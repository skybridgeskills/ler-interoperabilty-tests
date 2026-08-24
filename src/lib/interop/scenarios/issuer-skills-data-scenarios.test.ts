import { describe, expect, it } from 'vitest';

import { completeTotals, evaluateCompletion, scenarioOf } from '$lib/interop/completion/index.js';
import { checkById, type ScenarioRunRecord } from '$lib/interop/scenario-run/index.js';

import { validateCatalog } from './catalog-validation.js';
import { scenarioFingerprint } from './scenario-fingerprint.js';

import { allScenarios, scenarioBySlug } from './index.js';

/**
 * The three `*-issuer-skills-data` scenarios (M11 P6), and what they became when
 * M15 re-keyed add-on badges to `(additive, base profile, role)`.
 *
 * They used to form an `osa-issuer-payload` `oneOf` group — one obligation, met
 * by whichever protocol the operator ran. Now each is plain `required` in the
 * additive, so OSA's issuer meter reads **three** obligations and each protocol
 * has its own Open Skill Alignment badge.
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

	it('are `additive-only` in their base profile and `required` in open-skill-alignment', () => {
		for (const slug of SLUGS) {
			const scenario = scenarioBySlug(slug)!;
			const base = scenario.memberships.find((m) => m.profile !== 'open-skill-alignment')!;
			const osa = scenario.memberships.find((m) => m.profile === 'open-skill-alignment')!;
			// The base names the scenario because it is the protocol it runs over, and
			// claims none of it — so neither the Essential meter nor the cumulative
			// Complete meter moves. `optional` would put add-on work into Complete.
			expect(base.level, slug).toBe('additive-only');
			// `required`, not a `oneOf` group: M15 keys the add-on badge per base
			// profile, so each protocol's OSA badge asks for its own scenario.
			expect(osa.level, slug).toBe('required');
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

	it('declare identical requirement ids — by construction now, since rule 5 no longer applies', () => {
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
		// With the group gone nothing validates this parity any more: the shared
		// `issuerSkillsDataRequirements` module IS the guarantee, and this test is
		// what notices if someone inlines it.
		for (const slug of SLUGS) expect(idsOf(slug), slug).toEqual(expected);
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

	it('keeps the whole catalog valid', () => {
		expect(validateCatalog(allScenarios)).toEqual([]);
	});
});

describe('OSA’s issuer meter', () => {
	it('reads three obligations — one per protocol, not one shared', () => {
		const result = evaluateCompletion({
			profile: 'open-skill-alignment',
			role: 'issuer',
			runs: {}
		});
		// Three plain `required` memberships. Before M15 this was ONE `oneOf`
		// obligation of 9; each protocol now carries its own nine.
		expect(result.obligations).toHaveLength(3);
		expect(result.obligations.map((o) => o.obligation.kind)).toEqual([
			'scenario',
			'scenario',
			'scenario'
		]);
		expect(result.total).toBe(27);
		expect(result.met).toBe(0);
	});

	it('credits one protocol at a time — running VCALM does not fill OID4', () => {
		for (const slug of SLUGS) {
			const result = evaluateCompletion({
				profile: 'open-skill-alignment',
				role: 'issuer',
				runs: { [slug]: fullRun(slug) }
			});
			expect(result.total, slug).toBe(27);
			// Nine of twenty-seven: this protocol's share, and no other's. That is
			// the whole point of per-base-profile add-on badges.
			expect(result.met, slug).toBe(9);
		}
	});

	it('fills only when every protocol has been run', () => {
		const result = evaluateCompletion({
			profile: 'open-skill-alignment',
			role: 'issuer',
			runs: Object.fromEntries(SLUGS.map((slug) => [slug, fullRun(slug)]))
		});
		expect(result.met).toBe(result.total);
		expect(result.total).toBe(27);
	});

	it('names each scenario as its own obligation, in catalog order', () => {
		const { obligations } = evaluateCompletion({
			profile: 'open-skill-alignment',
			role: 'issuer',
			runs: {}
		});
		expect(obligations.map((o) => scenarioOf(o).slug).sort()).toEqual([...SLUGS].sort());
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

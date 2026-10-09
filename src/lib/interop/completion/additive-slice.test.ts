import { describe, expect, it, vi } from 'vitest';

import type { ScenarioRunRecord } from '$lib/interop/scenario-run/index.js';

/**
 * A catalog with additive work spread across two base profiles and two roles.
 *
 * No scenario in the real catalog declares an additive membership yet, so a
 * slice has nothing to measure there — these fixtures are how the partition gets
 * exercised before the first additive scenario is authored.
 *
 * - `oid4-w-di` — `additive-only` in oid4, **required** in DI, wallet
 * - `oid4-w-di-opt` — `additive-only` in oid4, **optional** in DI, wallet
 * - `vcalm-w-di` — `additive-only` in vcalm, required in DI, wallet
 * - `oid4-i-di` — `additive-only` in oid4, required in DI, **issuer**
 * - `oid4-i-skill` — `additive-only` in oid4, required in Skill Alignment, issuer
 * - `oid4-w-core` — plain `required` in oid4, wallet: the base profile's own work
 */
const catalog = vi.hoisted(() => {
	const requirement = (id: string) => ({
		id,
		statement: 'It worked.',
		level: 'MUST' as const,
		check: { kind: 'automatic' as const, checkId: 'exchange-reached-complete' }
	});
	const scenario = (
		slug: string,
		memberships: unknown[],
		requirementIds: string[],
		role: 'wallet' | 'issuer' = 'wallet'
	) => ({
		slug,
		name: slug,
		blurb: '',
		role,
		workflow: 'credential-acceptance' as const,
		memberships,
		steps: [
			{ id: 'offer', title: 'Offer', summary: '', requirements: requirementIds.map(requirement) }
		]
	});

	const di = 'data-integrity-cryptosuites';
	const skill = 'open-skill-alignment';
	return [
		scenario('oid4-w-core', [{ profile: 'oid4', level: 'required' }], ['k1']),
		scenario(
			'oid4-w-di',
			[
				{ profile: 'oid4', level: 'additive-only' },
				{ profile: di, level: 'required' }
			],
			['d1', 'd2']
		),
		scenario(
			'oid4-w-di-opt',
			[
				{ profile: 'oid4', level: 'additive-only' },
				{ profile: di, level: 'optional' }
			],
			['d3']
		),
		scenario(
			'vcalm-w-di',
			[
				{ profile: 'vcalm', level: 'additive-only' },
				{ profile: di, level: 'required' }
			],
			['v1']
		),
		scenario(
			'oid4-i-di',
			[
				{ profile: 'oid4', level: 'additive-only' },
				{ profile: di, level: 'required' }
			],
			['i1'],
			'issuer'
		),
		scenario(
			'oid4-i-skill',
			[
				{ profile: 'oid4', level: 'additive-only' },
				{ profile: skill, level: 'required' }
			],
			['s1'],
			'issuer'
		)
	];
});

vi.mock('$lib/interop/scenarios/all-scenarios.js', () => ({ allScenarios: catalog }));

import type { ObligationProgress } from './evaluate.js';

const { evaluateAdditiveSlice, sliceIsEmpty } = await import('./additive-slice.js');
const { completionGroups } = await import('./groups.js');

const slugsOf = (obligations: ObligationProgress[]) =>
	obligations.flatMap((o) =>
		o.obligation.kind === 'scenario' ? [o.obligation.scenario.slug] : []
	);

const slice = (baseProfile: 'oid4' | 'vcalm', role: 'wallet' | 'issuer') =>
	evaluateAdditiveSlice({
		additive: 'data-integrity-cryptosuites',
		baseProfile,
		role,
		runs: {} as Record<string, ScenarioRunRecord>
	});

describe('evaluateAdditiveSlice', () => {
	it('keeps only the additive work that lives in this base profile', () => {
		expect(slugsOf(slice('oid4', 'wallet').obligations)).toEqual(['oid4-w-di']);
		expect(slugsOf(slice('vcalm', 'wallet').obligations)).toEqual(['vcalm-w-di']);
	});

	it('keeps the additive’s own optional work as its own sub-meter', () => {
		const result = slice('oid4', 'wallet');

		expect(result).toMatchObject({ met: 0, total: 2 });
		expect(slugsOf(result.optional.obligations)).toEqual(['oid4-w-di-opt']);
		expect(result.optional.total).toBe(1);
	});

	it('never includes the base profile’s own work', () => {
		expect(slugsOf(slice('oid4', 'wallet').obligations)).not.toContain('oid4-w-core');
	});

	it('is empty for a role the additive does not reach in this base profile', () => {
		expect(sliceIsEmpty(slice('vcalm', 'issuer'))).toBe(true);
		expect(sliceIsEmpty(slice('oid4', 'issuer'))).toBe(false);
	});
});

describe('completionGroups with selected add-ons', () => {
	const groupFor = (key: string, additives?: string[]) =>
		completionGroups({
			runs: {},
			...(additives ? { additives: additives as never[] } : {})
		}).find((g) => `${g.profileSlug}:${g.roleSlug}` === key)!;

	it('carries no add-ons when none are selected', () => {
		expect(groupFor('oid4:wallet').additives).toEqual([]);
	});

	it('carries the slice for a selected add-on that reaches the group', () => {
		const group = groupFor('oid4:wallet', ['data-integrity-cryptosuites']);

		expect(group.additives.map((a) => a.slug)).toEqual(['data-integrity-cryptosuites']);
		expect(group.additives[0].result.total).toBe(2);
	});

	it('omits a selected add-on with no work in this group rather than showing 0/0', () => {
		// Skill Alignment applies to oid4 as a profile, but has no wallet scenario.
		expect(groupFor('oid4:wallet', ['open-skill-alignment']).additives).toEqual([]);
	});

	it('orders slices by the additive catalog, so two cards cannot disagree', () => {
		const group = groupFor('oid4:issuer', ['data-integrity-cryptosuites', 'open-skill-alignment']);

		expect(group.additives.map((a) => a.slug)).toEqual([
			'open-skill-alignment',
			'data-integrity-cryptosuites'
		]);
	});
});

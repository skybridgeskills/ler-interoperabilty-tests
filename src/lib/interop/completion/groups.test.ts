import { describe, expect, it } from 'vitest';

import type { ScenarioRunRecord } from '$lib/interop/scenario-run/index.js';
import { scenarioBySlug, scenarioFingerprint } from '$lib/interop/scenarios/index.js';

import {
	combinationHasScenario,
	completionGroups,
	completionGroupsForProfile,
	obligationsByWorkflow
} from './groups.js';

/** A record marking every requirement of a scenario passed, so the meter reads full. */
function fullRun(slug: string): ScenarioRunRecord {
	const scenario = scenarioBySlug(slug)!;
	const outcomes = Object.fromEntries(
		scenario.steps.flatMap((step) =>
			step.requirements.map((r) => [
				r.id,
				{
					requirementId: r.id,
					level: r.level,
					status: 'pass' as const,
					source: 'attested' as const
				}
			])
		)
	);
	return {
		scenarioSlug: slug,
		ranAt: '2026-08-18T00:00:00.000Z',
		fingerprint: scenarioFingerprint(scenario),
		status: 'passed',
		outcomes,
		attempts: 1
	};
}

describe('completionGroups', () => {
	it('emits a group only for a (profile, role) that has scenarios', () => {
		const groups = completionGroups({ runs: {} });
		// vcalm × verifier (M10a), oid4 × wallet (PoC) + oid4 × verifier (M10b), and
		// the migrated ob3-direct-delivery × verifier (M10) — profile-major, in
		// allProfiles order.
		expect(groups.map((g) => `${g.profileSlug}:${g.roleSlug}`)).toEqual([
			'vcalm:verifier',
			'oid4:wallet',
			'oid4:verifier',
			'ob3-direct-delivery:verifier'
		]);
	});

	it('carries no add-on slices against the real catalog — none declares an additive membership', () => {
		// Honest today: selecting an add-on adds nothing to a card because no
		// scenario claims one yet. The slice machinery is exercised against
		// fixtures in `additive-slice.test.ts`.
		const groups = completionGroups({
			runs: {},
			additives: ['data-integrity-cryptosuites', 'open-skill-alignment']
		});

		expect(groups.every((g) => g.additives.length === 0)).toBe(true);
	});

	it('carries M4’s evaluated result, not a recomputation', () => {
		const oid4 = completionGroups({ runs: {} }).find((g) => g.profileSlug === 'oid4')!;
		expect(oid4.result.met).toBe(0);
		expect(oid4.result.total).toBeGreaterThan(0);
	});

	it('fills the meter when every requirement is passed', () => {
		const runs = {
			'oid4-wallet-acceptance': fullRun('oid4-wallet-acceptance'),
			'oid4-wallet-refusal-discrimination': fullRun('oid4-wallet-refusal-discrimination')
		};
		const oid4 = completionGroups({ runs }).find((g) => g.profileSlug === 'oid4')!;
		expect(oid4.result.met).toBe(oid4.result.total);
	});
});

describe('completionGroupsForProfile', () => {
	it('scopes to one profile across its roles', () => {
		const groups = completionGroupsForProfile({
			profileSlug: 'oid4',
			profileName: 'OID4',
			runs: {}
		});
		// oid4 now spans both roles: wallet (PoC) and verifier (M10b).
		expect(groups.map((g) => g.roleSlug)).toEqual(['wallet', 'verifier']);
	});

	it('scopes vcalm to its verifier scenarios', () => {
		const groups = completionGroupsForProfile({
			profileSlug: 'vcalm',
			profileName: 'VCALM',
			runs: {}
		});
		expect(groups.map((g) => g.roleSlug)).toEqual(['verifier']);
	});

	it('is empty for a profile with no scenarios', () => {
		expect(
			completionGroupsForProfile({
				profileSlug: 'open-skill-alignment',
				profileName: 'Open Skill Alignment',
				runs: {}
			})
		).toEqual([]);
	});
});

describe('combinationHasScenario', () => {
	it('is true for the migrated oid4 wallet acceptance combination', () => {
		expect(
			combinationHasScenario({ role: 'wallet', workflow: 'credential-acceptance', profile: 'oid4' })
		).toBe(true);
	});

	it('is false for a combination with no scenario yet', () => {
		expect(
			combinationHasScenario({
				role: 'wallet',
				workflow: 'credential-acceptance',
				profile: 'vcalm'
			})
		).toBe(false);
		expect(
			combinationHasScenario({ role: 'issuer', workflow: 'credential-issuance', profile: 'oid4' })
		).toBe(false);
	});
});

describe('obligationsByWorkflow', () => {
	it('groups a set of obligations under their workflow', () => {
		const oid4 = completionGroups({ runs: {} }).find((g) => g.profileSlug === 'oid4')!;
		const byWorkflow = obligationsByWorkflow(oid4.result.obligations);
		expect(byWorkflow).toHaveLength(1);
		expect(byWorkflow[0].workflow).toBe('credential-acceptance');
		expect(byWorkflow[0].obligations.length).toBe(oid4.result.obligations.length);
	});
});

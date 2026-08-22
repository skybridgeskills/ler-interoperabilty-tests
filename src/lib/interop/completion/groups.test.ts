import { describe, expect, it } from 'vitest';

import { allCombinations } from '$lib/interop/accessors.js';
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
		// Every family is migrated now: verifier (M10/M10a/M10b), issuer (M11) and
		// wallet (the PoC pair plus M12's VCALM acceptance and both presentation
		// scenarios) — profile-major, in allProfiles order, role-minor in allRoles
		// order.
		expect(groups.map((g) => `${g.profileSlug}:${g.roleSlug}`)).toEqual([
			'vcalm:issuer',
			'vcalm:wallet',
			'vcalm:verifier',
			'oid4:issuer',
			'oid4:wallet',
			'oid4:verifier',
			'ob3-direct-delivery:issuer',
			'ob3-direct-delivery:verifier'
		]);
	});

	it('carries add-on slices on exactly the groups whose scenarios claim an additive', () => {
		// M11 is where selecting an add-on first changed a card — the issuer
		// scenarios name `open-skill-alignment` and `data-integrity-cryptosuites`.
		// M12 P7 added the DIC **wallet** axes, so the two live wallet groups now
		// carry a slice too. `ob3-direct-delivery:wallet` does not exist (that
		// profile has no wallet scenarios) and no verifier scenario names an
		// additive, so the verifier groups stay empty.
		const groups = completionGroups({
			runs: {},
			additives: ['data-integrity-cryptosuites', 'open-skill-alignment']
		});

		const withSlices = groups.filter((g) => g.additives.length > 0);
		expect(withSlices.map((g) => `${g.profileSlug}:${g.roleSlug}`)).toEqual([
			'vcalm:issuer',
			'vcalm:wallet',
			'oid4:issuer',
			'oid4:wallet',
			'ob3-direct-delivery:issuer'
		]);
		expect(
			groups.filter((g) => g.roleSlug === 'verifier').every((g) => g.additives.length === 0)
		).toBe(true);
	});

	it('leaves the Essential meters untouched when an add-on is selected', () => {
		// The regression that would silently make a base badge harder to earn:
		// every additive scenario is `additive-only` in its base profile — the base
		// names it because that protocol is what it runs over and claims none of it —
		// so a selection may add a slice but must never move the base denominator.
		const without = completionGroups({ runs: {} });
		const with_ = completionGroups({
			runs: {},
			additives: ['data-integrity-cryptosuites', 'open-skill-alignment']
		});
		const meters = (gs: typeof without) =>
			gs.map((g) => `${g.profileSlug}:${g.roleSlug}=${g.result.met}/${g.result.total}`);
		expect(meters(with_)).toEqual(meters(without));
	});

	it('carries M4’s evaluated result, not a recomputation', () => {
		const oid4 = completionGroups({ runs: {} }).find(
			(g) => g.profileSlug === 'oid4' && g.roleSlug === 'wallet'
		)!;
		expect(oid4.result.met).toBe(0);
		expect(oid4.result.total).toBeGreaterThan(0);
	});

	it('fills the meter when every requirement is passed', () => {
		const runs = {
			'oid4-wallet-acceptance': fullRun('oid4-wallet-acceptance'),
			'oid4-wallet-refusal-discrimination': fullRun('oid4-wallet-refusal-discrimination'),
			// The oid4 wallet role spans two workflows since M12 — acceptance and
			// presentation — so filling its meter means passing both.
			'oid4-wallet-presentation': fullRun('oid4-wallet-presentation')
		};
		const oid4 = completionGroups({ runs }).find(
			(g) => g.profileSlug === 'oid4' && g.roleSlug === 'wallet'
		)!;
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
		// oid4 now spans three roles: issuer (M11), wallet (PoC) and verifier (M10b).
		expect(groups.map((g) => g.roleSlug)).toEqual(['issuer', 'wallet', 'verifier']);
	});

	it('scopes vcalm to the roles it has scenarios for', () => {
		const groups = completionGroupsForProfile({
			profileSlug: 'vcalm',
			profileName: 'VCALM',
			runs: {}
		});
		expect(groups.map((g) => g.roleSlug)).toEqual(['issuer', 'wallet', 'verifier']);
	});

	it('omits a role the profile has no scenarios for', () => {
		// Every base profile has scenarios now (M11 completed the issuer family), so
		// the property is exercised per role instead: ob3-direct-delivery has issuer
		// and verifier scenarios and no wallet ones.
		const groups = completionGroupsForProfile({
			profileSlug: 'ob3-direct-delivery',
			profileName: 'OB 3.0 Direct Delivery',
			runs: {}
		});
		expect(groups.map((g) => g.roleSlug)).toEqual(['issuer', 'verifier']);
	});
});

describe('combinationHasScenario', () => {
	it('is true for the migrated oid4 wallet acceptance combination', () => {
		expect(
			combinationHasScenario({ role: 'wallet', workflow: 'credential-acceptance', profile: 'oid4' })
		).toBe(true);
	});

	it('is true for every combination the catalog actually has', () => {
		// M12 migrated the last three wallet pages, so NO real combination answers
		// false any more and the homepage's "Not yet migrated" section renders
		// nothing. That emptiness is what unblocks deleting `profile.checklists`,
		// so it is asserted here rather than left to be noticed.
		expect(allCombinations().filter((c) => !combinationHasScenario(c))).toEqual([]);
	});

	it('is false for a (role, workflow, profile) triple that is not a combination', () => {
		// There is no wallet × credential-request-and-verification checklist; the
		// function answers for any triple, and an unknown one has no scenario.
		expect(
			combinationHasScenario({
				role: 'wallet',
				workflow: 'credential-request-and-verification',
				profile: 'oid4'
			})
		).toBe(false);
	});
});

describe('obligationsByWorkflow', () => {
	it('groups a set of obligations under their workflow', () => {
		const oid4 = completionGroups({ runs: {} }).find(
			(g) => g.profileSlug === 'oid4' && g.roleSlug === 'wallet'
		)!;
		const byWorkflow = obligationsByWorkflow(oid4.result.obligations);
		// Two workflows since M12 gave the wallet role a presentation scenario, in
		// first-seen order — which is what the sub-headings render.
		expect(byWorkflow.map((w) => w.workflow)).toEqual([
			'credential-acceptance',
			'credential-presentation'
		]);
		expect(byWorkflow.flatMap((w) => w.obligations).length).toBe(oid4.result.obligations.length);
	});
});

import { describe, expect, it } from 'vitest';

import { automaticChecks } from '$lib/interop/scenario-run/automatic-checks.js';

import { allScenarios } from './all-scenarios.js';
import { baseProfileOf } from './membership.js';
import { oid4WalletAcceptance } from './oid4-wallet-acceptance.js';
import { oid4WalletRefusalDiscrimination } from './oid4-wallet-refusal-discrimination.js';
import type { Scenario } from './scenario-schema.js';
import { vcalmWalletAcceptance } from './vcalm-wallet-acceptance.js';
import { vcalmWalletRefusalDiscrimination } from './vcalm-wallet-refusal-discrimination.js';

/**
 * The VCALM wallet acceptance pair — the port of the two proof-of-concept
 * scenarios onto the other transport.
 *
 * The load-bearing assertions here are the **parity** ones. The two protocols
 * ask the same question of the same wallet, so a reader comparing an OID4 result
 * with a VCALM one must be comparing like with like; without a test, an edit to
 * one side drifts silently and the comparison quietly stops meaning anything.
 */

const requirementIds = (scenario: Scenario): string[] =>
	scenario.steps.flatMap((step) => step.requirements.map((r) => r.id));

const requirementShape = (scenario: Scenario) =>
	scenario.steps.flatMap((step) =>
		step.requirements.map((r) => ({
			id: r.id,
			level: r.level,
			check: r.check
		}))
	);

describe('the VCALM wallet acceptance scenarios', () => {
	it('are registered in the catalog', () => {
		const slugs = allScenarios.map((s) => s.slug);
		expect(slugs).toContain('vcalm-wallet-acceptance');
		expect(slugs).toContain('vcalm-wallet-refusal-discrimination');
	});

	it('name vcalm as their base profile, required', () => {
		for (const scenario of [vcalmWalletAcceptance, vcalmWalletRefusalDiscrimination]) {
			expect(baseProfileOf(scenario.memberships)).toBe('vcalm');
			expect(scenario.memberships).toEqual([{ profile: 'vcalm', level: 'required' }]);
		}
	});

	it('pin no issuing intent — they are elective, so any deployment can serve them', () => {
		for (const scenario of [vcalmWalletAcceptance, vcalmWalletRefusalDiscrimination]) {
			for (const step of scenario.steps) {
				expect(step.action && 'intent' in step.action ? step.action.intent : undefined).toBe(
					undefined
				);
			}
		}
	});

	it('name only registered automatic checks', () => {
		for (const scenario of [vcalmWalletAcceptance, vcalmWalletRefusalDiscrimination]) {
			for (const step of scenario.steps) {
				for (const requirement of step.requirements) {
					if (requirement.check.kind !== 'automatic') continue;
					expect(automaticChecks[requirement.check.checkId]).toBeDefined();
				}
			}
		}
	});

	describe('parity with the oid4 pair', () => {
		it('the acceptance scenarios measure exactly the same requirements', () => {
			expect(requirementShape(vcalmWalletAcceptance)).toEqual(
				requirementShape(oid4WalletAcceptance)
			);
		});

		it('the discrimination scenarios measure exactly the same requirements', () => {
			expect(requirementShape(vcalmWalletRefusalDiscrimination)).toEqual(
				requirementShape(oid4WalletRefusalDiscrimination)
			);
		});

		it('the discrimination scenarios offer the same three credentials', () => {
			expect(vcalmWalletRefusalDiscrimination.steps.map((s) => s.action)).toEqual(
				oid4WalletRefusalDiscrimination.steps.map((s) => s.action)
			);
		});
	});

	describe('the discrimination scenario', () => {
		it('shuffles all three passes contiguously, under a neutral label', () => {
			expect(vcalmWalletRefusalDiscrimination.steps.every((s) => s.shuffle === true)).toBe(true);
			expect(vcalmWalletRefusalDiscrimination.shuffleLabel).toBe('Credential');
		});

		it('never renders an authored title, so the passes cannot be learned by position', () => {
			// The titles exist for the catalog and for this test; the page shows
			// `${shuffleLabel} ${n}` instead. Asserted because a title like "Offer the
			// expired credential" IS the answer key.
			expect(requirementIds(vcalmWalletRefusalDiscrimination)).toEqual([
				'control-engaged',
				'control-handled',
				'control-legible',
				'expired-engaged',
				'expired-handled',
				'expired-legible',
				'tampered-engaged',
				'tampered-handled',
				'tampered-legible'
			]);
		});
	});
});

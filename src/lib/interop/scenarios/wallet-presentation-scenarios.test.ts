import { describe, expect, it } from 'vitest';

import { automaticChecks } from '$lib/interop/scenario-run/automatic-checks.js';

import { allScenarios } from './all-scenarios.js';
import { baseProfileOf } from './membership.js';
import { oid4WalletPresentation } from './oid4-wallet-presentation.js';
import type { Scenario } from './scenario-schema.js';
import { vcalmWalletPresentation } from './vcalm-wallet-presentation.js';
import { walletPresentationRequirements } from './wallet-presentation-requirements.js';

/**
 * The two wallet presentation scenarios — the last of the eight runnable page
 * families to migrate.
 *
 * Requirement ids are scenario-scoped, so declaring the same seven on both
 * protocols carries no catalog constraint; it is an authoring choice, and these
 * tests are what hold it. Without them the two scenarios drift and a reader
 * comparing an OID4 result with a VCALM one is quietly comparing two different
 * measurements.
 */

const both = [oid4WalletPresentation, vcalmWalletPresentation];

const requirementsOf = (scenario: Scenario) => scenario.steps.flatMap((s) => s.requirements);

describe('the wallet presentation scenarios', () => {
	it('are registered in the catalog', () => {
		const slugs = allScenarios.map((s) => s.slug);
		expect(slugs).toContain('oid4-wallet-presentation');
		expect(slugs).toContain('vcalm-wallet-presentation');
	});

	it('are required in their own base profile, and name no other', () => {
		expect(baseProfileOf(oid4WalletPresentation.memberships)).toBe('oid4');
		expect(baseProfileOf(vcalmWalletPresentation.memberships)).toBe('vcalm');
		for (const scenario of both) {
			expect(scenario.memberships).toHaveLength(1);
			expect(scenario.memberships[0].level).toBe('required');
		}
	});

	it('register under the credential-presentation workflow, in the wallet role', () => {
		for (const scenario of both) {
			expect(scenario.role).toBe('wallet');
			expect(scenario.workflow).toBe('credential-presentation');
		}
	});

	it('drive one `request-presentation` step against the shared ob3-any request', () => {
		for (const scenario of both) {
			expect(scenario.steps).toHaveLength(1);
			expect(scenario.steps[0].action).toEqual({
				kind: 'request-presentation',
				request: 'ob3-any'
			});
		}
	});

	it('declare the same seven requirements on both protocols', () => {
		for (const scenario of both) {
			expect(requirementsOf(scenario)).toEqual(walletPresentationRequirements);
		}
	});

	it('name only registered automatic checks', () => {
		for (const requirement of walletPresentationRequirements) {
			if (requirement.check.kind !== 'automatic') continue;
			expect(automaticChecks[requirement.check.checkId]).toBeDefined();
		}
	});

	it('attest exactly the two MUSTs the exchange cannot observe', () => {
		// Consent and the credential-selection interface. This reverses the
		// black-box scoring ADR's `n/a` resolution, which weighed operator burden
		// against a third status the scenario model does not have — so the choice
		// is now attest or drop, and both are observations of the run just
		// performed. Anything more attested here would be manufacturing confidence
		// the exchange can support; anything less would drop a real MUST.
		const attested = walletPresentationRequirements
			.filter((r) => r.check.kind === 'attested')
			.map((r) => r.id);
		expect(attested).toEqual(['user-consent', 'presentation-interface']);
	});

	it('carries no requirement above a MUST/SHOULD level, and no MAY', () => {
		for (const requirement of walletPresentationRequirements) {
			expect(['MUST', 'SHOULD']).toContain(requirement.level);
		}
	});

	it('are distinctly named, so two rows never read alike', () => {
		const names = allScenarios.map((s) => s.name);
		expect(new Set(names).size).toBe(names.length);
	});
});

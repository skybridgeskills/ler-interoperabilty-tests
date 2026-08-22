import { describe, expect, it } from 'vitest';

import { checkById } from '$lib/interop/scenario-run/index.js';

import { validateCatalog } from './catalog-validation.js';
import { scenarioFingerprint } from './scenario-fingerprint.js';

import { scenarioBySlug } from './index.js';

/**
 * The OB 3.0 direct-delivery issuer scenario (M11 P2) — the first
 * `receive-from-issuer` scenario and the one that proves the shared
 * `credential-*` family the two live issuer scenarios reuse.
 */
describe('ob3-direct-issuer-delivery', () => {
	const scenario = scenarioBySlug('ob3-direct-issuer-delivery')!;

	it('is a single-step issuer scenario, required in ob3-direct-delivery', () => {
		expect(scenario.role).toBe('issuer');
		expect(scenario.workflow).toBe('direct-credential-issuance');
		expect(scenario.memberships).toEqual([{ profile: 'ob3-direct-delivery', level: 'required' }]);
		expect(scenario.steps).toHaveLength(1);
		expect(scenario.steps[0].shuffle).toBeUndefined();
	});

	it('receives over the `direct` transport, with no recipe and no intent', () => {
		expect(scenario.steps[0].action).toEqual({
			kind: 'receive-from-issuer',
			transport: 'direct'
		});
	});

	it('carries the nine requirements mapping.md § 1 re-homes, in order', () => {
		const [step] = scenario.steps;
		expect(step.requirements.map((r) => r.id)).toEqual([
			'vcdm2',
			'ob3-type',
			'identifier-email',
			'eddsa-proof',
			'status-list',
			'issuer-did',
			'valid-until',
			'downloadable-file',
			'copy-paste-text'
		]);
	});

	it('names seven registered automatic checks and two attested affirms', () => {
		const [step] = scenario.steps;
		const automatic = step.requirements.filter((r) => r.check.kind === 'automatic');
		expect(automatic.map((r) => (r.check.kind === 'automatic' ? r.check.checkId : ''))).toEqual([
			'credential-vcdm2',
			'credential-ob3-type',
			'credential-subject-identifier-email',
			'credential-di-proof-eddsa',
			'credential-status-list',
			'credential-issuer-did',
			'credential-valid-until'
		]);
		for (const requirement of automatic) {
			if (requirement.check.kind === 'automatic') {
				expect(checkById(requirement.check.checkId), requirement.check.checkId).toBeDefined();
			}
		}
		const attested = step.requirements.filter((r) => r.check.kind === 'attested');
		expect(attested.map((r) => r.id)).toEqual(['downloadable-file', 'copy-paste-text']);
		// Authored so `true` is the expected answer — the schema has no `expected`.
		expect(
			attested.every((r) => r.check.kind === 'attested' && r.check.answer.kind === 'affirm')
		).toBe(true);
	});

	it('gates on the two delivery affordances, which the legacy list scored `n/a`', () => {
		const [step] = scenario.steps;
		const gating = step.requirements.filter((r) => r.level === 'MUST').map((r) => r.id);
		expect(gating).toContain('downloadable-file');
		expect(gating).toContain('copy-paste-text');
	});

	it('makes only `valid-until` a SHOULD', () => {
		const [step] = scenario.steps;
		expect(step.requirements.filter((r) => r.level === 'SHOULD').map((r) => r.id)).toEqual([
			'valid-until'
		]);
	});

	it('keeps the catalog valid and its fingerprint stable', () => {
		expect(validateCatalog([scenario])).toEqual([]);
		expect(scenarioFingerprint(scenario)).toBe(scenarioFingerprint(scenario));
	});
});

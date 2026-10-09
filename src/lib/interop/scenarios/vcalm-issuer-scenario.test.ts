import { describe, expect, it } from 'vitest';

import { checkById } from '$lib/interop/scenario-run/index.js';

import { validateCatalog } from './catalog-validation.js';
import { scenarioFingerprint } from './scenario-fingerprint.js';

import { scenarioBySlug } from './index.js';

/**
 * The VCALM issuer scenario (M11 P4) — the second of the three base issuer
 * verticals, and the first to measure a live issuer-driven exchange.
 */
describe('vcalm-issuer-issuance', () => {
	const scenario = scenarioBySlug('vcalm-issuer-issuance')!;

	it('is a pure-automatic single-step issuer scenario, required in vcalm', () => {
		expect(scenario.role).toBe('issuer');
		expect(scenario.workflow).toBe('credential-issuance');
		expect(scenario.memberships).toEqual([{ profile: 'vcalm', level: 'required' }]);
		expect(scenario.steps).toHaveLength(1);
		expect(scenario.steps[0].requirements.every((r) => r.check.kind === 'automatic')).toBe(true);
	});

	it('receives over vcalm with an explicitly authored key-proof suite and no intent', () => {
		expect(scenario.steps[0].action).toEqual({
			kind: 'receive-from-issuer',
			transport: 'vcalm',
			keyProofSuite: 'eddsa-rdfc-2022'
		});
	});

	it('carries the twelve requirements mapping.md § 2 re-homes — the wire six, then the payload six', () => {
		expect(scenario.steps[0].requirements.map((r) => r.id)).toEqual([
			'interaction-url',
			'participation-endpoint',
			'tls',
			'vcapi-in-protocols',
			'didauth-requested',
			'binds-holder',
			'vcdm2',
			'ob3-type',
			'di-proof',
			'status-list',
			'issuer-did',
			'valid-until'
		]);
	});

	it('names twelve registered checks, reusing the shared payload family', () => {
		const checkIds = scenario.steps[0].requirements.map((r) =>
			r.check.kind === 'automatic' ? r.check.checkId : ''
		);
		expect(checkIds).toEqual([
			'vcalm-issuer-interaction-url',
			'vcalm-issuer-participation-endpoint',
			'vcalm-issuer-tls',
			'vcalm-issuer-vcapi-in-protocols',
			'vcalm-issuer-didauth-requested',
			'issuer-binds-holder-did',
			'credential-vcdm2',
			'credential-ob3-type',
			'credential-di-proof-bundle',
			'credential-status-list',
			'credential-issuer-did',
			'credential-valid-until'
		]);
		for (const id of checkIds) expect(checkById(id), id).toBeDefined();
	});

	it('drops the two `problemdetails` rows — no negative probe, no attested equivalent', () => {
		const ids = scenario.steps[0].requirements.map((r) => r.id).join(' ');
		expect(ids).not.toMatch(/problemdetails/);
	});

	it('makes only `valid-until` a SHOULD', () => {
		expect(
			scenario.steps[0].requirements.filter((r) => r.level === 'SHOULD').map((r) => r.id)
		).toEqual(['valid-until']);
	});

	it('keeps the catalog valid and its fingerprint stable', () => {
		expect(validateCatalog([scenario])).toEqual([]);
		expect(scenarioFingerprint(scenario)).toBe(scenarioFingerprint(scenario));
	});
});

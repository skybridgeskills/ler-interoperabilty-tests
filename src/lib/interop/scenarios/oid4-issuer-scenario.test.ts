import { describe, expect, it } from 'vitest';

import { checkById } from '$lib/interop/scenario-run/index.js';

import { validateCatalog } from './catalog-validation.js';
import { scenarioFingerprint } from './scenario-fingerprint.js';

import { scenarioBySlug } from './index.js';

/**
 * The OID4VCI issuer scenario (M11 P5) — the last of the three base issuer
 * verticals.
 */
describe('oid4-issuer-issuance', () => {
	const scenario = scenarioBySlug('oid4-issuer-issuance')!;

	it('is a pure-automatic single-step issuer scenario, required in oid4', () => {
		expect(scenario.role).toBe('issuer');
		expect(scenario.workflow).toBe('credential-issuance');
		expect(scenario.memberships).toEqual([{ profile: 'oid4', level: 'required' }]);
		expect(scenario.steps).toHaveLength(1);
		expect(scenario.steps[0].requirements.every((r) => r.check.kind === 'automatic')).toBe(true);
	});

	it('receives over oid4vci with an explicitly authored key-proof suite and no intent', () => {
		expect(scenario.steps[0].action).toEqual({
			kind: 'receive-from-issuer',
			transport: 'oid4vci',
			keyProofSuite: 'eddsa-rdfc-2022'
		});
	});

	it('carries the fifteen requirements mapping.md § 3 re-homes', () => {
		expect(scenario.steps[0].requirements.map((r) => r.id)).toEqual([
			'metadata-endpoint',
			'di-vp-proof-type',
			'di-vp-signing-algs',
			'not-jwt-only',
			'tls',
			'pre-auth-code',
			'credential-endpoint',
			'di-vp-accepted',
			'binds-holder',
			'vcdm2',
			'ob3-type',
			'di-proof',
			'status-list',
			'issuer-did',
			'valid-until'
		]);
	});

	it('names fifteen registered checks, reusing the shared payload and binding checks', () => {
		const checkIds = scenario.steps[0].requirements.map((r) =>
			r.check.kind === 'automatic' ? r.check.checkId : ''
		);
		expect(checkIds).toEqual([
			'oid4-issuer-metadata-endpoint',
			'oid4-issuer-di-vp-proof-type',
			'oid4-issuer-di-vp-signing-algs',
			'oid4-issuer-not-jwt-only-proof',
			'oid4-issuer-tls',
			'oid4-issuer-pre-authorized-code',
			'oid4-issuer-credential-endpoint',
			'oid4-issuer-di-vp-accepted',
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

	it('carries one TLS row, not two — `tls-credential` is merged away', () => {
		const tlsRows = scenario.steps[0].requirements.filter((r) => r.id.includes('tls'));
		expect(tlsRows.map((r) => r.id)).toEqual(['tls']);
	});

	it('makes only `valid-until` a SHOULD', () => {
		expect(
			scenario.steps[0].requirements.filter((r) => r.level === 'SHOULD').map((r) => r.id)
		).toEqual(['valid-until']);
	});

	it('shares its payload and binding checks with the VCALM issuer scenario', () => {
		const vcalm = scenarioBySlug('vcalm-issuer-issuance')!;
		const idsOf = (s: typeof scenario) =>
			new Set(
				s.steps[0].requirements
					.map((r) => (r.check.kind === 'automatic' ? r.check.checkId : ''))
					.filter((id) => id.startsWith('credential-') || id === 'issuer-binds-holder-did')
			);
		expect(idsOf(scenario)).toEqual(idsOf(vcalm));
	});

	it('keeps the catalog valid and its fingerprint stable', () => {
		expect(validateCatalog([scenario])).toEqual([]);
		expect(scenarioFingerprint(scenario)).toBe(scenarioFingerprint(scenario));
	});
});

import { describe, expect, it, vi } from 'vitest';

import { Scenario } from './scenario-schema.js';

// The accessors read the module-level catalog, exactly as `interop/accessors.ts`
// reads `allProfiles`. The real catalog is empty until the PoC scenarios are
// authored, so stand a small one in its place rather than weakening the API
// with an injection parameter.
const catalog = vi.hoisted(() => {
	const step = (id: string) => ({
		id,
		title: 'Offer the credential',
		summary: 'We will issue your wallet a credential.',
		action: { kind: 'issue' as const, credential: 'minimal-ob3' },
		requirements: [
			{
				id: `${id}-complete`,
				statement: 'The exchange completed.',
				level: 'MUST' as const,
				check: { kind: 'automatic' as const, checkId: 'exchange-reached-complete' }
			}
		]
	});

	return [
		{
			slug: 'oid4-wallet-acceptance',
			name: 'Accept a well-formed credential',
			blurb: 'The happy path.',
			role: 'wallet' as const,
			workflow: 'credential-acceptance' as const,
			memberships: [{ profile: 'oid4' as const, level: 'required' as const }],
			steps: [step('offer')]
		},
		{
			slug: 'oid4-wallet-ecdsa-acceptance',
			name: 'Accept an ECDSA credential',
			blurb: 'The same, signed differently.',
			role: 'wallet' as const,
			workflow: 'credential-acceptance' as const,
			memberships: [
				{ profile: 'oid4' as const, level: 'optional' as const },
				{ profile: 'data-integrity-cryptosuites' as const, level: 'required' as const }
			],
			steps: [step('offer')]
		},
		{
			slug: 'vcalm-issuer-issuance',
			name: 'Issue over VCALM',
			blurb: 'The issuer side.',
			role: 'issuer' as const,
			workflow: 'credential-issuance' as const,
			memberships: [{ profile: 'vcalm' as const, level: 'required' as const }],
			steps: [step('mint')]
		}
	];
});

vi.mock('./all-scenarios.js', () => ({ allScenarios: catalog.map((s) => Scenario(s)) }));

const { membershipsOfProfile, scenarioBySlug, scenariosFor } = await import('./accessors.js');

describe('scenarioBySlug', () => {
	it('finds a registered scenario', () => {
		expect(scenarioBySlug('oid4-wallet-acceptance')?.name).toBe('Accept a well-formed credential');
	});

	it('returns undefined for an unknown slug', () => {
		expect(scenarioBySlug('no-such-scenario')).toBeUndefined();
	});
});

describe('scenariosFor', () => {
	it('returns the scenarios a base profile names, for that role', () => {
		expect(scenariosFor('oid4', 'wallet').map((s) => s.slug)).toEqual([
			'oid4-wallet-acceptance',
			'oid4-wallet-ecdsa-acceptance'
		]);
	});

	it('includes a scenario whose membership is optional — the level does not filter', () => {
		expect(scenariosFor('oid4', 'wallet').map((s) => s.slug)).toContain(
			'oid4-wallet-ecdsa-acceptance'
		);
	});

	it('returns the scenarios an additive profile names', () => {
		expect(scenariosFor('data-integrity-cryptosuites', 'wallet').map((s) => s.slug)).toEqual([
			'oid4-wallet-ecdsa-acceptance'
		]);
	});

	it('filters by role', () => {
		expect(scenariosFor('oid4', 'issuer')).toEqual([]);
		expect(scenariosFor('vcalm', 'issuer').map((s) => s.slug)).toEqual(['vcalm-issuer-issuance']);
	});

	it('returns an empty list for a profile no scenario names', () => {
		expect(scenariosFor('ob3-direct-delivery', 'verifier')).toEqual([]);
	});
});

describe('membershipsOfProfile', () => {
	it('inverts the catalog into a profile’s membership set', () => {
		expect(membershipsOfProfile('oid4')).toEqual([
			{ scenario: expect.objectContaining({ slug: 'oid4-wallet-acceptance' }), level: 'required' },
			{
				scenario: expect.objectContaining({ slug: 'oid4-wallet-ecdsa-acceptance' }),
				level: 'optional'
			}
		]);
	});

	it('gives the same scenario a different level in a different profile’s set', () => {
		const inBase = membershipsOfProfile('oid4').find(
			(m) => m.scenario.slug === 'oid4-wallet-ecdsa-acceptance'
		);
		const inAdditive = membershipsOfProfile('data-integrity-cryptosuites').find(
			(m) => m.scenario.slug === 'oid4-wallet-ecdsa-acceptance'
		);
		expect(inBase?.level).toBe('optional');
		expect(inAdditive?.level).toBe('required');
	});

	it('spans roles — a membership set is not role-scoped', () => {
		expect(membershipsOfProfile('vcalm').map((m) => m.scenario.slug)).toEqual([
			'vcalm-issuer-issuance'
		]);
	});

	it('returns an empty set for a profile no scenario names', () => {
		expect(membershipsOfProfile('open-skill-alignment')).toEqual([]);
	});
});

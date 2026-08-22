import { describe, expect, it } from 'vitest';

import {
	additiveProfileBySlug,
	additiveProfilesForBaseProfile,
	roleBySlug,
	rolesOfAdditiveProfile,
	workflowBySlug,
	workflowsForRole
} from './accessors.js';

describe('workflowsForRole', () => {
	it('returns 2 workflows for issuer', () => {
		expect(
			workflowsForRole('issuer')
				.map((w) => w.slug)
				.sort()
		).toEqual(['credential-issuance', 'direct-credential-issuance']);
	});

	it('returns 2 workflows for wallet', () => {
		expect(
			workflowsForRole('wallet')
				.map((w) => w.slug)
				.sort()
		).toEqual(['credential-acceptance', 'credential-presentation']);
	});

	it('returns 2 workflows for verifier', () => {
		expect(
			workflowsForRole('verifier')
				.map((w) => w.slug)
				.sort()
		).toEqual(['credential-request-and-verification', 'direct-credential-verification']);
	});
});

describe('roleBySlug / workflowBySlug', () => {
	it('round-trips canonical slugs', () => {
		expect(roleBySlug('verifier')?.name).toBe('Verifier');
		expect(workflowBySlug('credential-presentation')?.name).toBe('Credential Presentation');
	});
});

describe('additive profile accessors', () => {
	it('resolves open-skill-alignment by slug', () => {
		const p = additiveProfileBySlug('open-skill-alignment');
		expect(p?.slug).toBe('open-skill-alignment');
		expect(p?.appliesToBaseProfiles).toContain('ob3-direct-delivery');
	});

	it('resolves data-integrity-cryptosuites by slug', () => {
		const p = additiveProfileBySlug('data-integrity-cryptosuites');
		expect(p?.slug).toBe('data-integrity-cryptosuites');
		expect(p?.appliesToBaseProfiles).toEqual(['vcalm', 'oid4', 'ob3-direct-delivery']);
		// Roles now come from the catalog, not a list on the profile: an additive is
		// demonstrable in a role when a scenario there names it.
		expect(rolesOfAdditiveProfile(p!)).toEqual(['issuer', 'wallet']);
	});

	it('returns undefined for an unknown slug', () => {
		expect(additiveProfileBySlug('not-a-slug')).toBeUndefined();
	});

	it('lists both additives as applicable to ob3-direct-delivery', () => {
		const list = additiveProfilesForBaseProfile('ob3-direct-delivery').map((p) => p.slug);
		expect(list).toEqual(['open-skill-alignment', 'data-integrity-cryptosuites']);
	});

	it('lists both additives as applicable to vcalm', () => {
		const list = additiveProfilesForBaseProfile('vcalm').map((p) => p.slug);
		expect(list).toEqual(['open-skill-alignment', 'data-integrity-cryptosuites']);
	});

	it('lists both additives as applicable to oid4', () => {
		const list = additiveProfilesForBaseProfile('oid4').map((p) => p.slug);
		expect(list).toEqual(['open-skill-alignment', 'data-integrity-cryptosuites']);
	});
});

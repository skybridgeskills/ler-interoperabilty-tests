import { describe, expect, it } from 'vitest';

import { fromSearchParams, toSearchParams } from './selection-link.js';

describe('toSearchParams', () => {
	it('joins each dimension’s slugs and omits empty ones', () => {
		const params = toSearchParams({
			roles: ['wallet', 'verifier'],
			profiles: [],
			additiveProfiles: ['data-integrity-cryptosuites']
		});
		expect(params.toString()).toBe('roles=wallet%2Cverifier&addons=data-integrity-cryptosuites');
	});

	it('is empty for an empty selection', () => {
		expect(toSearchParams({ roles: [], profiles: [], additiveProfiles: [] }).toString()).toBe('');
	});
});

describe('fromSearchParams', () => {
	it('is undefined when the URL carries no selection', () => {
		expect(fromSearchParams(new URLSearchParams('utm=x'))).toBeUndefined();
	});

	it('round-trips a selection', () => {
		const selection = {
			roles: ['wallet' as const],
			profiles: ['vcalm' as const, 'oid4' as const],
			additiveProfiles: ['open-skill-alignment' as const]
		};
		expect(fromSearchParams(toSearchParams(selection))).toEqual(selection);
	});

	it('drops unknown and duplicate slugs and fills absent dimensions with nothing', () => {
		expect(fromSearchParams(new URLSearchParams('roles=wallet,admin,wallet'))).toEqual({
			roles: ['wallet'],
			profiles: [],
			additiveProfiles: []
		});
	});
});

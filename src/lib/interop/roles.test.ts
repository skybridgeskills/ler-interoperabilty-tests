import { describe, expect, it } from 'vitest';

import { roleBySlug } from './accessors.js';
import { allRoles } from './roles.js';

describe('allRoles', () => {
	it('has exactly 3 roles in canonical order', () => {
		expect(allRoles.map((r) => r.slug)).toEqual(['issuer', 'wallet', 'verifier']);
	});
});

describe('roleBySlug', () => {
	it('resolves a known slug', () => {
		expect(roleBySlug('verifier')?.name).toBe('Verifier');
	});

	it('returns undefined for an unknown slug', () => {
		expect(roleBySlug('xxx')).toBeUndefined();
	});
});

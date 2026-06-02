import { describe, expect, it } from 'vitest';

import { AdditiveProfile, AdditiveProfileSlug } from './additive-profile-schema.js';

describe('AdditiveProfileSlug', () => {
	it('parses the canonical slug', () => {
		expect(AdditiveProfileSlug('open-skill-alignment')).toBe('open-skill-alignment');
	});

	it('rejects an unknown slug', () => {
		expect(() => AdditiveProfileSlug('not-a-slug' as 'open-skill-alignment')).toThrow();
	});
});

describe('AdditiveProfile', () => {
	it('parses a minimal valid profile', () => {
		const p = AdditiveProfile({
			id: 'open-skill-alignment-v1',
			slug: 'open-skill-alignment',
			name: 'Open Skill Alignment',
			version: '0.1',
			status: 'draft',
			lastUpdated: '2026-05-15',
			description: 'Adds skill-alignment data to OpenBadgeCredentials.',
			appliesToBaseProfiles: ['ob3-direct-delivery'],
			checklists: []
		});
		expect(p.slug).toBe('open-skill-alignment');
		expect(p.appliesToBaseProfiles).toEqual(['ob3-direct-delivery']);
	});

	it('rejects an empty appliesToBaseProfiles array', () => {
		expect(() =>
			AdditiveProfile({
				id: 'x',
				slug: 'open-skill-alignment',
				name: 'x',
				version: '0.1',
				status: 'draft',
				lastUpdated: '2026-05-15',
				description: 'x',
				appliesToBaseProfiles: [],
				checklists: []
			})
		).toThrow();
	});

	it('rejects an unknown base-profile slug', () => {
		expect(() =>
			AdditiveProfile({
				id: 'x',
				slug: 'open-skill-alignment',
				name: 'x',
				version: '0.1',
				status: 'draft',
				lastUpdated: '2026-05-15',
				description: 'x',
				appliesToBaseProfiles: ['not-a-profile' as 'ob3-direct-delivery'],
				checklists: []
			})
		).toThrow();
	});
});

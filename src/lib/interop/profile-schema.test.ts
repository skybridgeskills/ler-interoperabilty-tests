import { describe, expect, it } from 'vitest';

import { Profile } from './profile-schema.js';

describe('Profile', () => {
	it('parses a minimal profile', () => {
		const p = Profile({
			id: 'test-v1',
			slug: 'vcalm',
			name: 'Test',
			version: '0.1',
			status: 'draft',
			lastUpdated: '2026-01-01',
			description: 'A test profile.',
			keyComponents: [{ label: 'Suite', value: 'eddsa' }],
			useCases: ['testing']
		});
		expect(p.slug).toBe('vcalm');
		expect(p.notes).toBeUndefined();
		expect(p.url).toBeUndefined();
	});

	it('parses a profile with a valid url', () => {
		const p = Profile({
			id: 'test-v1',
			slug: 'vcalm',
			name: 'Test',
			version: '0.1',
			status: 'draft',
			url: 'https://example.com/profiles/test/',
			lastUpdated: '2026-01-01',
			description: 'A test profile.',
			keyComponents: [{ label: 'Suite', value: 'eddsa' }],
			useCases: ['testing']
		});
		expect(p.url).toBe('https://example.com/profiles/test/');
	});

	it('rejects an invalid url', () => {
		expect(() =>
			Profile({
				id: 'test-v1',
				slug: 'vcalm',
				name: 'Test',
				version: '0.1',
				status: 'draft',
				url: 'not-a-url',
				lastUpdated: '2026-01-01',
				description: 'A test profile.',
				keyComponents: [],
				useCases: []
			})
		).toThrow();
	});
});

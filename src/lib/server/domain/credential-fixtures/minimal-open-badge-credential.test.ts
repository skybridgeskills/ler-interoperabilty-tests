import { describe, expect, it } from 'vitest';

import { minimalOpenBadgeCredential } from './minimal-open-badge-credential.js';

const ISSUER = 'did:key:zIssuer';
const HOLDER = 'did:key:zHolder';

describe('minimalOpenBadgeCredential', () => {
	it('produces a schema-complete minimal OB3 body', () => {
		const c = minimalOpenBadgeCredential({ issuerDid: ISSUER, holderDid: HOLDER });

		expect(c.type).toEqual(['VerifiableCredential', 'OpenBadgeCredential']);
		expect(c.validFrom).toBeTypeOf('string');
		expect(c.id).toMatch(/^urn:uuid:/);

		const issuer = c.issuer as { id: string; type: string[] };
		expect(issuer.id).toBe(ISSUER);
		expect(issuer.type).toContain('Profile');

		const subject = c.credentialSubject as {
			id: string;
			type: string[];
			achievement: Record<string, unknown>;
		};
		expect(subject.id).toBe(HOLDER);
		expect(subject.type).toContain('AchievementSubject');

		const achievement = subject.achievement as {
			id: string;
			type: string[];
			name: string;
			description: string;
			criteria: { narrative: string };
		};
		expect(achievement.id).toBeTypeOf('string');
		expect(achievement.type).toContain('Achievement');
		expect(achievement.name).toBeTypeOf('string');
		expect(achievement.description).toBeTypeOf('string');
		expect(achievement.criteria.narrative).toBeTypeOf('string');
	});

	it('applies id and validFrom overrides', () => {
		const c = minimalOpenBadgeCredential({
			issuerDid: ISSUER,
			holderDid: HOLDER,
			id: 'urn:uuid:fixed',
			validFrom: '2020-01-01T00:00:00Z'
		});
		expect(c.id).toBe('urn:uuid:fixed');
		expect(c.validFrom).toBe('2020-01-01T00:00:00Z');
	});
});

import { describe, expect, it } from 'vitest';

import { badgeBySlug, badgeFingerprint } from '$lib/interop/badges/index.js';

import { buildBadgeCredential } from './badge-recipe.js';

const badge = badgeBySlug('oid4-wallet')!;
const rootUrl = 'https://tests.example';

function build() {
	return buildBadgeCredential({
		badge,
		award: {
			requirementsMet: 3,
			requirementsTotal: 4,
			scenarioCount: 2,
			claimedAt: '2026-08-18T00:00:00Z'
		},
		credentialId: 'urn:uuid:fixed-for-test',
		rootUrl
	});
}

describe('buildBadgeCredential', () => {
	it('versions criteria.id with the badge fingerprint and leaves achievement.id unversioned', () => {
		const doc = build();
		const subject = doc.credentialSubject as Record<string, unknown>;
		const achievement = subject.achievement as Record<string, unknown>;
		const criteria = achievement.criteria as Record<string, unknown>;

		expect(achievement.id).toBe(`${rootUrl}/badges/oid4-wallet`);
		expect(criteria.id).toBe(`${rootUrl}/badges/oid4-wallet?v=${badgeFingerprint(badge)}`);
	});

	it('carries no evidence / credentialStatus / image / validUntil', () => {
		const doc = build();
		expect(doc).not.toHaveProperty('evidence');
		expect(doc).not.toHaveProperty('credentialStatus');
		expect(doc).not.toHaveProperty('image');
		expect(doc).not.toHaveProperty('validUntil');
	});

	it('keeps issuer an object with a placeholder id the tenant seed overwrites', () => {
		// The services REPLACE issuer.id rather than inject it, so it must exist as a
		// placeholder (as minimal-ob3 does) — never a real did:web.
		const issuer = build().issuer as Record<string, unknown>;
		expect(issuer.id).toBe('did:key:placeholder');
		expect(issuer.type).toEqual(['Profile']);
		expect(issuer.name).toBe('LER Interoperability Test Suite');
	});

	it('carries the OB3-required descriptions (top-level and on the achievement)', () => {
		const doc = build();
		const achievement = (doc.credentialSubject as Record<string, unknown>).achievement as Record<
			string,
			unknown
		>;
		expect(String(doc.description).length).toBeGreaterThan(0);
		expect(String(achievement.description).length).toBeGreaterThan(0);
	});

	it('uses the holder placeholder token and the per-award narrative', () => {
		const subject = build().credentialSubject as Record<string, unknown>;
		expect(subject.id).toBe('{{HOLDER_DID}}');
		expect(String(subject.narrative)).toContain('3 of 4 requirements');
	});
});

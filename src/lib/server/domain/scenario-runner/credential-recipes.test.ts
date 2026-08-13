import { describe, expect, it } from 'vitest';

import { allRecipeIds, credentialRecipes, recipeById } from './credential-recipes.js';
import { allRequestIds, requestById } from './presentation-requests.js';

describe('credential recipes', () => {
	it('resolves a registered recipe by id', () => {
		expect(recipeById('minimal-ob3')?.id).toBe('minimal-ob3');
	});

	it('returns undefined for an unknown id, leaving the 400 to the route', () => {
		expect(recipeById('no-such-recipe')).toBeUndefined();
	});

	it('keys every recipe under its own id', () => {
		for (const [key, recipe] of Object.entries(credentialRecipes)) {
			expect(recipe.id).toBe(key);
		}
	});

	it('lists its ids for error messages', () => {
		expect(allRecipeIds()).toContain('minimal-ob3');
		expect(allRecipeIds()).toContain('ob3-expired');
	});

	it('stamps the caller’s credential id rather than hardcoding one', () => {
		for (const recipe of Object.values(credentialRecipes)) {
			const built = recipe.build({ credentialId: 'urn:uuid:supplied' });
			expect(built.id).toBe('urn:uuid:supplied');
		}
	});

	it('leaves credentialSubject.id as the holder placeholder the service overwrites', () => {
		for (const recipe of Object.values(credentialRecipes)) {
			const subject = recipe.build({ credentialId: 'urn:uuid:x' }).credentialSubject as {
				id: string;
			};
			expect(subject.id).toBe('{{HOLDER_DID}}');
		}
	});

	it('never hand-crafts a credentialStatus — the status service owns it', () => {
		for (const recipe of Object.values(credentialRecipes)) {
			expect(recipe.build({ credentialId: 'urn:uuid:x' })).not.toHaveProperty('credentialStatus');
		}
	});

	it('never carries a proof — the credential is unsigned at this point', () => {
		for (const recipe of Object.values(credentialRecipes)) {
			expect(recipe.build({ credentialId: 'urn:uuid:x' })).not.toHaveProperty('proof');
		}
	});
});

describe('minimal-ob3', () => {
	it('is a well-formed OB3 credential with no validity window', () => {
		const built = recipeById('minimal-ob3')!.build({ credentialId: 'urn:uuid:x' });

		expect(built['@context']).toContain('https://www.w3.org/ns/credentials/v2');
		expect(built.type).toEqual(['VerifiableCredential', 'OpenBadgeCredential']);
		expect(built).not.toHaveProperty('validUntil');
	});
});

describe('ob3-expired', () => {
	it('differs from the control only by its validity window', () => {
		const control = recipeById('minimal-ob3')!.build({ credentialId: 'urn:uuid:x' });
		const expired = recipeById('ob3-expired')!.build({ credentialId: 'urn:uuid:x' });

		const { validFrom: _cf, ...controlRest } = control;
		const { validFrom: _ef, validUntil: _eu, ...expiredRest } = expired;
		expect(expiredRest).toEqual(controlRest);
	});

	it('ended in the past', () => {
		const built = recipeById('ob3-expired')!.build({ credentialId: 'urn:uuid:x' });

		expect(Date.parse(String(built.validUntil))).toBeLessThan(Date.parse('2025-01-01T00:00:00Z'));
		expect(Date.parse(String(built.validFrom))).toBeLessThan(Date.parse(String(built.validUntil)));
	});
});

describe('presentation requests', () => {
	it('resolves a registered request by id', () => {
		expect(requestById('ob3-any')?.vprCredentialType).toEqual(['OpenBadgeCredential']);
	});

	it('returns undefined for an unknown id', () => {
		expect(requestById('no-such-request')).toBeUndefined();
	});

	it('lists its ids for error messages', () => {
		expect(allRequestIds()).toContain('ob3-any');
	});

	it('carries the OB3 context the QueryByExample selects on', () => {
		expect(requestById('ob3-any')?.vprContext).toContain(
			'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json'
		);
	});
});

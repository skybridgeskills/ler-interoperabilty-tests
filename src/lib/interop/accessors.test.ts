import { describe, expect, it } from 'vitest';

import {
	additiveChecklistsForCombination,
	additiveProfileBySlug,
	additiveProfilesForBaseProfile,
	allCombinations,
	combinationFor,
	profileBySlug,
	profileWorkflows,
	profilesForCombination,
	roleBySlug,
	workflowBySlug,
	workflowsForRole
} from './accessors.js';

describe('allCombinations', () => {
	it('returns exactly 10 valid (role, workflow, profile) combinations', () => {
		expect(allCombinations()).toHaveLength(10);
	});
});

describe('per-profile checklist composition', () => {
	it('vcalm has 4 checklists across the protocol-based workflows', () => {
		const p = profileBySlug('vcalm')!;
		expect(p.checklists.map((c) => `${c.role}/${c.workflow}`).sort()).toEqual([
			'issuer/credential-issuance',
			'verifier/credential-request-and-verification',
			'wallet/credential-acceptance',
			'wallet/credential-presentation'
		]);
	});

	it('oid4 has the same 4 checklists', () => {
		const p = profileBySlug('oid4')!;
		expect(p.checklists.map((c) => `${c.role}/${c.workflow}`).sort()).toEqual([
			'issuer/credential-issuance',
			'verifier/credential-request-and-verification',
			'wallet/credential-acceptance',
			'wallet/credential-presentation'
		]);
	});

	it('ob3-direct-delivery has the 2 standalone checklists', () => {
		const p = profileBySlug('ob3-direct-delivery')!;
		expect(p.checklists.map((c) => `${c.role}/${c.workflow}`).sort()).toEqual([
			'issuer/direct-credential-issuance',
			'verifier/direct-credential-verification'
		]);
	});
});

describe('combinationFor', () => {
	it('resolves a valid combination with at least one step', () => {
		const combo = combinationFor('issuer', 'credential-issuance', 'vcalm');
		expect(combo?.checklist.steps.length).toBeGreaterThan(0);
		expect(combo?.profile.slug).toBe('vcalm');
	});

	it('returns undefined for an invalid combination', () => {
		expect(combinationFor('issuer', 'credential-issuance', 'ob3-direct-delivery')).toBeUndefined();
	});
});

describe('profilesForCombination', () => {
	it('returns the 2 protocol profiles for wallet × credential-presentation', () => {
		const slugs = profilesForCombination('wallet', 'credential-presentation').map((p) => p.slug);
		expect(slugs.sort()).toEqual(['oid4', 'vcalm']);
	});

	it('returns ob3-direct-delivery for verifier × direct-credential-verification', () => {
		const slugs = profilesForCombination('verifier', 'direct-credential-verification').map(
			(p) => p.slug
		);
		expect(slugs).toEqual(['ob3-direct-delivery']);
	});
});

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

describe('profileWorkflows', () => {
	it('expands each checklist to a {workflow, role} pair', () => {
		const ob3 = profileBySlug('ob3-direct-delivery')!;
		const rows = profileWorkflows(ob3);
		expect(rows).toHaveLength(2);
		expect(rows.map((r) => r.workflow.slug).sort()).toEqual([
			'direct-credential-issuance',
			'direct-credential-verification'
		]);
		expect(rows.find((r) => r.role.slug === 'issuer')?.workflow.slug).toBe(
			'direct-credential-issuance'
		);
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
		expect(p?.checklists.map((c) => `${c.role}/${c.workflow}`).sort()).toEqual([
			'issuer/credential-issuance',
			'issuer/direct-credential-issuance',
			'verifier/credential-request-and-verification',
			'wallet/credential-acceptance',
			'wallet/credential-presentation'
		]);
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

describe('additiveChecklistsForCombination', () => {
	it('applies the DI exchange issuer checklist to vcalm', () => {
		const result = additiveChecklistsForCombination('vcalm', 'issuer', 'credential-issuance');
		const di = result.find((r) => r.additive.slug === 'data-integrity-cryptosuites');
		expect(di).toBeDefined();
		expect(di?.checklist.steps).toHaveLength(2);
	});

	it('applies the same DI exchange checklist to oid4 (matched by role+workflow)', () => {
		const result = additiveChecklistsForCombination('oid4', 'wallet', 'credential-acceptance');
		const di = result.find((r) => r.additive.slug === 'data-integrity-cryptosuites');
		expect(di).toBeDefined();
		expect(di?.checklist.role).toBe('wallet');
		expect(di?.checklist.workflow).toBe('credential-acceptance');
	});

	it('applies the producer-only DI checklist to ob3-direct-delivery issuance', () => {
		const result = additiveChecklistsForCombination(
			'ob3-direct-delivery',
			'issuer',
			'direct-credential-issuance'
		);
		const di = result.find((r) => r.additive.slug === 'data-integrity-cryptosuites');
		expect(di).toBeDefined();
		expect(di?.checklist.steps).toHaveLength(1);
	});

	it('applies the open-skill-alignment issuer checklist to vcalm issuance', () => {
		const result = additiveChecklistsForCombination('vcalm', 'issuer', 'credential-issuance');
		const osa = result.find((r) => r.additive.slug === 'open-skill-alignment');
		expect(osa).toBeDefined();
		expect(osa?.checklist.steps).toHaveLength(2);
	});

	it('applies the open-skill-alignment issuer checklist to oid4 issuance', () => {
		const result = additiveChecklistsForCombination('oid4', 'issuer', 'credential-issuance');
		const osa = result.find((r) => r.additive.slug === 'open-skill-alignment');
		expect(osa).toBeDefined();
		expect(osa?.checklist.steps).toHaveLength(2);
	});

	it('still applies the open-skill-alignment checklist to ob3-direct-delivery issuance', () => {
		const result = additiveChecklistsForCombination(
			'ob3-direct-delivery',
			'issuer',
			'direct-credential-issuance'
		);
		const osa = result.find((r) => r.additive.slug === 'open-skill-alignment');
		expect(osa).toBeDefined();
		expect(osa?.checklist.steps).toHaveLength(2);
	});

	it('does not apply DI where it has no checklist for the (role, workflow)', () => {
		const result = additiveChecklistsForCombination(
			'ob3-direct-delivery',
			'verifier',
			'direct-credential-verification'
		);
		expect(result.find((r) => r.additive.slug === 'data-integrity-cryptosuites')).toBeUndefined();
	});
});

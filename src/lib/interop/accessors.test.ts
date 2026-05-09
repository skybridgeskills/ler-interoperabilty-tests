import { describe, expect, it } from 'vitest';

import {
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
	it('vcalm-eddsa has 4 checklists across the protocol-based workflows', () => {
		const p = profileBySlug('vcalm-eddsa')!;
		expect(p.checklists.map((c) => `${c.role}/${c.workflow}`).sort()).toEqual([
			'issuer/credential-issuance',
			'verifier/credential-request-and-verification',
			'wallet/credential-acceptance',
			'wallet/credential-presentation'
		]);
	});

	it('oid4-ecdsa has the same 4 checklists', () => {
		const p = profileBySlug('oid4-ecdsa')!;
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
		const combo = combinationFor('issuer', 'credential-issuance', 'vcalm-eddsa');
		expect(combo?.checklist.steps.length).toBeGreaterThan(0);
		expect(combo?.profile.slug).toBe('vcalm-eddsa');
	});

	it('returns undefined for an invalid combination', () => {
		expect(combinationFor('issuer', 'credential-issuance', 'ob3-direct-delivery')).toBeUndefined();
	});
});

describe('profilesForCombination', () => {
	it('returns the 2 protocol profiles for wallet × credential-presentation', () => {
		const slugs = profilesForCombination('wallet', 'credential-presentation').map((p) => p.slug);
		expect(slugs.sort()).toEqual(['oid4-ecdsa', 'vcalm-eddsa']);
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

import { describe, expect, it } from 'vitest';

import { allCombinations } from '$lib/interop/accessors.js';
import type { ProfileSlug, RoleSlug } from '$lib/interop/profile-schema.js';

import {
	isCombinationSelected,
	sortCombinations,
	type ChecklistCombination,
	type Selection
} from './checklist-selection.js';

function selection(roles: RoleSlug[], profiles: ProfileSlug[]): Selection {
	return { roles: new Set(roles), profiles: new Set(profiles) };
}

const issuerVcalm: ChecklistCombination = {
	role: 'issuer',
	workflow: 'credential-issuance',
	profile: 'vcalm'
};

describe('isCombinationSelected', () => {
	it('is true only when both role and profile are selected', () => {
		expect(isCombinationSelected(issuerVcalm, selection(['issuer'], ['vcalm']))).toBe(true);
	});

	it('is false when only the role is selected', () => {
		expect(isCombinationSelected(issuerVcalm, selection(['issuer'], []))).toBe(false);
	});

	it('is false when only the profile is selected', () => {
		expect(isCombinationSelected(issuerVcalm, selection([], ['vcalm']))).toBe(false);
	});

	it('is false when neither is selected', () => {
		expect(isCombinationSelected(issuerVcalm, selection(['wallet'], ['oid4-ecdsa']))).toBe(false);
	});

	it('is false for an empty selection', () => {
		expect(isCombinationSelected(issuerVcalm, selection([], []))).toBe(false);
	});
});

describe('sortCombinations', () => {
	it('places selected combinations before unselected ones', () => {
		const unselected: ChecklistCombination = {
			role: 'verifier',
			workflow: 'credential-request-and-verification',
			profile: 'oid4-ecdsa'
		};
		const combos = [unselected, issuerVcalm];
		const sorted = sortCombinations(combos, selection(['issuer'], ['vcalm']));
		expect(sorted[0]).toEqual(issuerVcalm);
		expect(sorted[1]).toEqual(unselected);
	});

	it('orders by role then workflow then profile within a partition', () => {
		// All unselected (empty selection) so the whole array is one partition.
		const a: ChecklistCombination = {
			role: 'verifier',
			workflow: 'direct-credential-verification',
			profile: 'ob3-direct-delivery'
		};
		const b: ChecklistCombination = {
			role: 'issuer',
			workflow: 'direct-credential-issuance',
			profile: 'vcalm'
		};
		const c: ChecklistCombination = {
			role: 'issuer',
			workflow: 'credential-issuance',
			profile: 'oid4-ecdsa'
		};
		const d: ChecklistCombination = {
			role: 'issuer',
			workflow: 'credential-issuance',
			profile: 'vcalm'
		};
		const sorted = sortCombinations([a, b, c, d], selection([], []));
		// issuer rows first; within issuer, credential-issuance before
		// direct-credential-issuance; within credential-issuance, vcalm before
		// oid4-ecdsa; verifier last.
		expect(sorted).toEqual([d, c, b, a]);
	});

	it('does not mutate the input array', () => {
		const input = [
			issuerVcalm,
			{
				role: 'verifier',
				workflow: 'credential-request-and-verification',
				profile: 'oid4-ecdsa'
			} as ChecklistCombination
		];
		const snapshot = [...input];
		sortCombinations(input, selection(['verifier'], ['oid4-ecdsa']));
		expect(input).toEqual(snapshot);
	});

	it('handles the real combination set without throwing and preserves length', () => {
		const combos = allCombinations();
		const sorted = sortCombinations(combos, selection(['issuer'], ['vcalm']));
		expect(sorted).toHaveLength(combos.length);
	});
});

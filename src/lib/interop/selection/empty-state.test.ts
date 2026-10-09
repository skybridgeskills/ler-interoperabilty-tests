import { describe, expect, it } from 'vitest';

import { rolesOfProfile } from '$lib/interop/accessors.js';

import { coverageLine, emptyStateCopy, joinNames, profileMismatch } from './empty-state.js';

describe('joinNames', () => {
	it('joins one, two and three names', () => {
		expect(joinNames(['A'], 'and')).toBe('A');
		expect(joinNames(['A', 'B'], 'or')).toBe('A or B');
		expect(joinNames(['A', 'B', 'C'], 'and')).toBe('A, B and C');
	});
});

describe('rolesOfProfile', () => {
	it('names the roles a profile has scenario sets in, in catalog order', () => {
		// OB 3.0 Direct Delivery has no wallet scenario — the catalog's one role gap.
		expect(rolesOfProfile('ob3-direct-delivery')).toEqual(['issuer', 'verifier']);
		expect(rolesOfProfile('vcalm')).toEqual(['issuer', 'wallet', 'verifier']);
	});
});

describe('emptyStateCopy', () => {
	it('names the gap and what each selected profile covers', () => {
		expect(emptyStateCopy({ roles: ['wallet'], profiles: ['ob3-direct-delivery'] })).toEqual({
			headline: 'No Wallet scenario set for OB 3.0 Direct Delivery yet.',
			coverage: ['OB 3.0 Direct Delivery covers Issuers and Verifiers.']
		});
	});

	it('joins several roles and profiles with "or"', () => {
		expect(
			emptyStateCopy({ roles: ['wallet', 'issuer'], profiles: ['vcalm', 'oid4'] }).headline
		).toBe('No Wallet or Issuer scenario set for VCALM or OID4 yet.');
	});
});

describe('coverageLine', () => {
	it('lists the plural roles a profile covers', () => {
		expect(coverageLine('vcalm')).toBe('VCALM covers Issuers, Wallets and Verifiers.');
	});
});

describe('profileMismatch', () => {
	it('annotates a profile with no set for any selected role', () => {
		expect(profileMismatch('ob3-direct-delivery', ['wallet'])).toBe(
			'No Wallet scenario set — covers Issuers and Verifiers'
		);
	});

	it('is silent when no role is selected or one selected role is covered', () => {
		expect(profileMismatch('ob3-direct-delivery', [])).toBeUndefined();
		expect(profileMismatch('ob3-direct-delivery', ['wallet', 'issuer'])).toBeUndefined();
	});
});

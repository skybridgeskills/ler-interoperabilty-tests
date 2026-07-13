import { describe, expect, it } from 'vitest';

import {
	combinedRequirements,
	isRunOutdated,
	runChecklistFingerprint,
	type FingerprintRequirement
} from './checklist-fingerprint.js';
import type { TestRunRecord } from './test-run-record.js';

const reqs: FingerprintRequirement[] = [
	{ id: 'a', level: 'MUST', text: 'alpha' },
	{ id: 'b', level: 'SHOULD', text: 'beta' },
	{ id: 'c', level: 'MAY', text: 'gamma' }
];

describe('runChecklistFingerprint', () => {
	it('is deterministic: same input → same output across calls', () => {
		expect(runChecklistFingerprint(reqs)).toBe(runChecklistFingerprint(reqs));
	});

	it('is order-independent (reorder-insensitive)', () => {
		const reordered = [reqs[2], reqs[0], reqs[1]];
		expect(runChecklistFingerprint(reordered)).toBe(runChecklistFingerprint(reqs));
	});

	it('changes when a requirement text changes', () => {
		const mutated = [{ ...reqs[0], text: 'alpha!' }, reqs[1], reqs[2]];
		expect(runChecklistFingerprint(mutated)).not.toBe(runChecklistFingerprint(reqs));
	});

	it('changes when a requirement level changes', () => {
		const mutated = [{ ...reqs[0], level: 'SHOULD' }, reqs[1], reqs[2]];
		expect(runChecklistFingerprint(mutated)).not.toBe(runChecklistFingerprint(reqs));
	});

	it('changes when a requirement is added', () => {
		const extra = [...reqs, { id: 'd', level: 'MUST', text: 'delta' }];
		expect(runChecklistFingerprint(extra)).not.toBe(runChecklistFingerprint(reqs));
	});

	it('returns a zero-padded 8-hex-digit string', () => {
		expect(runChecklistFingerprint(reqs)).toMatch(/^[0-9a-f]{8}$/);
	});
});

describe('combinedRequirements', () => {
	it('flattens a real combination into non-empty, id-bearing requirements', () => {
		const combined = combinedRequirements('issuer', 'credential-issuance', 'vcalm');
		expect(combined.length).toBeGreaterThan(0);
		for (const r of combined) {
			expect(typeof r.id).toBe('string');
			expect(r.id.length).toBeGreaterThan(0);
		}
	});

	it('returns [] for an invalid combination', () => {
		expect(combinedRequirements('wallet', 'direct-credential-verification', 'vcalm')).toEqual([]);
	});

	it('feeds a stable fingerprint for a real combination', () => {
		const combined = combinedRequirements('issuer', 'credential-issuance', 'vcalm');
		expect(runChecklistFingerprint(combined)).toBe(runChecklistFingerprint(combined));
	});
});

describe('isRunOutdated', () => {
	const record = { checklistFingerprint: runChecklistFingerprint(reqs) } as TestRunRecord;

	it('is false when the fingerprint still matches the live checklist', () => {
		expect(isRunOutdated(record, reqs)).toBe(false);
	});

	it('is true when the live checklist has drifted', () => {
		const drifted = [{ ...reqs[0], text: 'changed' }, reqs[1], reqs[2]];
		expect(isRunOutdated(record, drifted)).toBe(true);
	});
});

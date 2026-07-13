import { describe, expect, it } from 'vitest';

import type { RunStateDerivation } from '$lib/interop/runner-state.js';

import type { RequirementStatus } from './requirement-status.js';
import {
	TestRunRecord,
	statusFromExchange,
	statusFromIssuerReport,
	statusFromVerifierReport,
	statusFromWalletReport,
	testRunRecord
} from './test-run-record.js';

function derivation(run: RunStateDerivation['run']): RunStateDerivation {
	return { run, perStep: ['pending'] };
}

const statuses: Record<string, RequirementStatus> = {
	'vcalm.signature-valid': { tone: 'pass', label: 'PASS' }
};

describe('statusFromExchange', () => {
	it('maps complete to passed', () => {
		expect(statusFromExchange(derivation('complete'))).toBe('passed');
	});

	it('maps error to failed', () => {
		expect(statusFromExchange(derivation('error'))).toBe('failed');
	});

	it('maps in-progress states to incomplete', () => {
		expect(statusFromExchange(derivation('idle'))).toBe('incomplete');
		expect(statusFromExchange(derivation('awaiting-wallet'))).toBe('incomplete');
		expect(statusFromExchange(derivation('wallet-connected'))).toBe('incomplete');
	});
});

describe('statusFromIssuerReport', () => {
	it('maps fatalError present to failed', () => {
		expect(statusFromIssuerReport({ verified: true, fatalError: { message: 'boom' } })).toBe(
			'failed'
		);
	});

	it('maps verified without fatalError to passed', () => {
		expect(statusFromIssuerReport({ verified: true })).toBe('passed');
	});

	it('maps not-verified to failed', () => {
		expect(statusFromIssuerReport({ verified: false })).toBe('failed');
	});
});

describe('statusFromWalletReport', () => {
	it('derives passed/failed/incomplete from exchange state + verified', () => {
		expect(statusFromWalletReport({ verified: true, exchangeState: 'complete' })).toBe('passed');
		expect(statusFromWalletReport({ verified: false, exchangeState: 'complete' })).toBe('failed');
		expect(statusFromWalletReport({ verified: true, exchangeState: 'pending' })).toBe('incomplete');
		expect(statusFromWalletReport({ verified: true, exchangeState: 'invalid' })).toBe('failed');
	});
});

describe('statusFromVerifierReport', () => {
	it('maps verified to passed and not-verified to failed', () => {
		expect(statusFromVerifierReport({ verified: true })).toBe('passed');
		expect(statusFromVerifierReport({ verified: false })).toBe('failed');
	});
});

describe('testRunRecord', () => {
	it('produces a parseable v2 record, defaulting id + ISO ranAt', () => {
		const record = testRunRecord({
			role: 'wallet',
			workflow: 'credential-issuance',
			profile: 'vcalm',
			status: 'passed',
			checklistFingerprint: 'deadbeef',
			statuses
		});

		expect(() => TestRunRecord.schema.parse(record)).not.toThrow();
		expect(record.status).toBe('passed');
		expect(record.checklistFingerprint).toBe('deadbeef');
		expect(record.statuses['vcalm.signature-valid']).toEqual({ tone: 'pass', label: 'PASS' });
		expect(typeof record.id).toBe('string');
		expect(record.id.length).toBeGreaterThan(0);
		expect(new Date(record.ranAt).toISOString()).toBe(record.ranAt);
	});

	it('gives each record a distinct id', () => {
		const args = {
			role: 'wallet',
			workflow: 'credential-issuance',
			profile: 'vcalm',
			status: 'passed',
			checklistFingerprint: 'f',
			statuses
		} as const;
		expect(testRunRecord(args).id).not.toBe(testRunRecord(args).id);
	});

	it('carries an optional error', () => {
		const record = testRunRecord({
			role: 'issuer',
			workflow: 'direct-credential-verification',
			profile: 'ob3-direct-delivery',
			status: 'failed',
			checklistFingerprint: 'f',
			statuses: {},
			error: { message: 'boom', hint: 'retry' }
		});
		expect(record.error).toEqual({ message: 'boom', hint: 'retry' });
	});
});

describe('TestRunRecord validation', () => {
	it('rejects a record missing status', () => {
		expect(() =>
			TestRunRecord.schema.parse({
				role: 'wallet',
				workflow: 'credential-issuance',
				profile: 'vcalm',
				checklistFingerprint: 'f',
				statuses: {}
			})
		).toThrow();
	});

	it('rejects a record missing the checklist fingerprint', () => {
		expect(() =>
			TestRunRecord.schema.parse({
				role: 'wallet',
				workflow: 'credential-issuance',
				profile: 'vcalm',
				status: 'passed',
				statuses: {}
			})
		).toThrow();
	});

	it('rejects a malformed status entry', () => {
		expect(() =>
			TestRunRecord.schema.parse({
				role: 'wallet',
				workflow: 'credential-issuance',
				profile: 'vcalm',
				status: 'passed',
				checklistFingerprint: 'f',
				statuses: { 'some.req': { tone: 'mystery', label: 'X' } }
			})
		).toThrow();
	});
});

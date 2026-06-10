import { describe, expect, it } from 'vitest';

import type { RunStateDerivation } from '$lib/interop/runner-state.js';

import {
	TestRunRecord,
	exchangeRunRecord,
	issuerReportRunRecord,
	statusFromExchange,
	statusFromIssuerReport
} from './test-run-record.js';

function derivation(run: RunStateDerivation['run']): RunStateDerivation {
	return { run, perStep: ['pending'] };
}

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

describe('exchangeRunRecord', () => {
	it('produces a parseable record with the correct status, kind, and ISO ranAt', () => {
		const record = exchangeRunRecord({
			role: 'wallet',
			workflow: 'credential-issuance',
			profile: 'vcalm',
			exchangeId: 'abc',
			exchangeState: 'complete',
			derived: derivation('complete')
		});

		expect(() => TestRunRecord.schema.parse(record)).not.toThrow();
		expect(record.status).toBe('passed');
		expect(record.payload.kind).toBe('exchange');
		expect(new Date(record.ranAt).toISOString()).toBe(record.ranAt);
	});
});

describe('issuerReportRunRecord', () => {
	it('produces a parseable record with the correct status, kind, and ISO ranAt', () => {
		const record = issuerReportRunRecord({
			role: 'issuer',
			workflow: 'direct-credential-verification',
			profile: 'ob3-direct-delivery',
			verified: true,
			failingMustCount: 0
		});

		expect(() => TestRunRecord.schema.parse(record)).not.toThrow();
		expect(record.status).toBe('passed');
		expect(record.payload.kind).toBe('issuer-report');
		expect(new Date(record.ranAt).toISOString()).toBe(record.ranAt);
	});
});

describe('TestRunRecord validation', () => {
	it('rejects a record missing status', () => {
		expect(() =>
			TestRunRecord.schema.parse({
				role: 'wallet',
				workflow: 'credential-issuance',
				profile: 'vcalm',
				ranAt: new Date().toISOString(),
				payload: { kind: 'issuer-report', verified: true, failingMustCount: 0 }
			})
		).toThrow();
	});

	it('rejects an unknown payload.kind', () => {
		expect(() =>
			TestRunRecord.schema.parse({
				role: 'wallet',
				workflow: 'credential-issuance',
				profile: 'vcalm',
				ranAt: new Date().toISOString(),
				status: 'passed',
				payload: { kind: 'mystery' }
			})
		).toThrow();
	});
});

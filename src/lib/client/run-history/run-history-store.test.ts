import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	exchangeRunRecord,
	issuerReportRunRecord,
	type TestRunRecord
} from '$lib/interop/run-history/test-run-record.js';

import {
	allLatestRuns,
	clearRunHistory,
	latestRunFor,
	recordRun,
	runCombinationKey,
	runsFor
} from './run-history-store.js';

const STORAGE_KEY = 'lits.run-history.v1';

let backing: Map<string, string>;

beforeEach(() => {
	backing = new Map<string, string>();
	vi.stubGlobal('localStorage', {
		getItem: (k: string) => backing.get(k) ?? null,
		setItem: (k: string, v: string) => void backing.set(k, v),
		removeItem: (k: string) => void backing.delete(k),
		clear: () => backing.clear()
	});
});

afterEach(() => vi.unstubAllGlobals());

function walletRun(ranAt: string): TestRunRecord {
	const record = exchangeRunRecord({
		role: 'wallet',
		workflow: 'credential-issuance',
		profile: 'vcalm',
		exchangeState: 'complete',
		derived: { run: 'complete', perStep: ['complete'] }
	});
	record.ranAt = ranAt;
	return record;
}

describe('recordRun retention', () => {
	it('caps a combination at 3 runs, evicting the oldest, newest-first', () => {
		recordRun(walletRun('2026-06-01T00:00:00.000Z'));
		recordRun(walletRun('2026-06-02T00:00:00.000Z'));
		recordRun(walletRun('2026-06-03T00:00:00.000Z'));
		recordRun(walletRun('2026-06-04T00:00:00.000Z'));

		const runs = runsFor('wallet', 'credential-issuance', 'vcalm');
		expect(runs).toHaveLength(3);
		expect(runs.map((r) => r.ranAt)).toEqual([
			'2026-06-04T00:00:00.000Z',
			'2026-06-03T00:00:00.000Z',
			'2026-06-02T00:00:00.000Z'
		]);
	});

	it('evicts per-combination, leaving other combinations untouched', () => {
		const other = issuerReportRunRecord({
			role: 'issuer',
			workflow: 'direct-credential-verification',
			profile: 'ob3-direct-delivery',
			verified: true,
			failingMustCount: 0
		});
		other.ranAt = '2026-06-01T00:00:00.000Z';
		recordRun(other);

		recordRun(walletRun('2026-06-02T00:00:00.000Z'));
		recordRun(walletRun('2026-06-03T00:00:00.000Z'));
		recordRun(walletRun('2026-06-04T00:00:00.000Z'));
		recordRun(walletRun('2026-06-05T00:00:00.000Z'));

		expect(runsFor('wallet', 'credential-issuance', 'vcalm')).toHaveLength(3);
		expect(runsFor('issuer', 'direct-credential-verification', 'ob3-direct-delivery')).toHaveLength(
			1
		);
	});
});

describe('latestRunFor', () => {
	it('returns the most recently recorded run', () => {
		recordRun(walletRun('2026-06-01T00:00:00.000Z'));
		recordRun(walletRun('2026-06-02T00:00:00.000Z'));

		expect(latestRunFor('wallet', 'credential-issuance', 'vcalm')?.ranAt).toBe(
			'2026-06-02T00:00:00.000Z'
		);
	});

	it('returns undefined for a combination with no runs', () => {
		expect(latestRunFor('verifier', 'credential-presentation', 'oid4-ecdsa')).toBeUndefined();
	});
});

describe('malformed localStorage', () => {
	it('treats invalid JSON as empty and does not throw', () => {
		backing.set(STORAGE_KEY, '{not json');
		expect(() => runsFor('wallet', 'credential-issuance', 'vcalm')).not.toThrow();
		expect(runsFor('wallet', 'credential-issuance', 'vcalm')).toEqual([]);
	});

	it('drops entries with a bad shape', () => {
		backing.set(
			STORAGE_KEY,
			JSON.stringify({
				'wallet:credential-issuance:vcalm': [{ totally: 'wrong' }]
			})
		);
		expect(latestRunFor('wallet', 'credential-issuance', 'vcalm')).toBeUndefined();
	});
});

describe('allLatestRuns', () => {
	it('returns one entry per combination keyed by runCombinationKey', () => {
		recordRun(walletRun('2026-06-01T00:00:00.000Z'));
		recordRun(walletRun('2026-06-02T00:00:00.000Z'));

		const issuer = issuerReportRunRecord({
			role: 'issuer',
			workflow: 'direct-credential-verification',
			profile: 'ob3-direct-delivery',
			verified: true,
			failingMustCount: 0
		});
		issuer.ranAt = '2026-06-03T00:00:00.000Z';
		recordRun(issuer);

		const latest = allLatestRuns();
		expect(latest.size).toBe(2);
		expect(latest.get(runCombinationKey('wallet', 'credential-issuance', 'vcalm'))?.ranAt).toBe(
			'2026-06-02T00:00:00.000Z'
		);
		expect(
			latest.get(
				runCombinationKey('issuer', 'direct-credential-verification', 'ob3-direct-delivery')
			)?.ranAt
		).toBe('2026-06-03T00:00:00.000Z');
	});
});

describe('clearRunHistory', () => {
	it('removes all persisted history', () => {
		recordRun(walletRun('2026-06-01T00:00:00.000Z'));
		clearRunHistory();
		expect(runsFor('wallet', 'credential-issuance', 'vcalm')).toEqual([]);
	});
});

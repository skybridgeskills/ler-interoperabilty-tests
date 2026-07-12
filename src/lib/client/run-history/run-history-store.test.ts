import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RequirementStatus } from '$lib/interop/run-history/requirement-status.js';
import { type TestRunRecord, testRunRecord } from '$lib/interop/run-history/test-run-record.js';

import {
	allLatestRuns,
	clearRunHistory,
	latestRunFor,
	recordRun,
	runById,
	runCombinationKey,
	runsFor
} from './run-history-store.js';

const STORAGE_KEY = 'lits.run-history.v2';
const LEGACY_STORAGE_KEY = 'lits.run-history.v1';

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

const passStatus: Record<string, RequirementStatus> = {
	'vcalm.signature-valid': { tone: 'pass', label: 'PASS' }
};

function walletRun(ranAt: string): TestRunRecord {
	const record = testRunRecord({
		role: 'wallet',
		workflow: 'credential-issuance',
		profile: 'vcalm',
		status: 'passed',
		checklistFingerprint: 'wallet-fp',
		statuses: passStatus
	});
	record.ranAt = ranAt;
	return record;
}

function issuerRun(ranAt: string): TestRunRecord {
	const record = testRunRecord({
		role: 'issuer',
		workflow: 'direct-credential-verification',
		profile: 'ob3-direct-delivery',
		status: 'passed',
		checklistFingerprint: 'issuer-fp',
		statuses: {}
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
		recordRun(issuerRun('2026-06-01T00:00:00.000Z'));
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

describe('v2 round-trip', () => {
	it('persists and reads back a full flat record', () => {
		const record = walletRun('2026-06-01T00:00:00.000Z');
		recordRun(record);

		const [read] = runsFor('wallet', 'credential-issuance', 'vcalm');
		expect(read).toEqual(record);
		expect(read.checklistFingerprint).toBe('wallet-fp');
		expect(read.statuses['vcalm.signature-valid']).toEqual({ tone: 'pass', label: 'PASS' });
	});

	it('writes under the .v2 key and clears the legacy .v1 store', () => {
		backing.set(LEGACY_STORAGE_KEY, JSON.stringify({ stale: [] }));
		recordRun(walletRun('2026-06-01T00:00:00.000Z'));

		expect(backing.has(STORAGE_KEY)).toBe(true);
		expect(backing.has(LEGACY_STORAGE_KEY)).toBe(false);
	});
});

describe('runById', () => {
	it('finds a run by its id across combinations', () => {
		const wallet = walletRun('2026-06-01T00:00:00.000Z');
		const issuer = issuerRun('2026-06-02T00:00:00.000Z');
		recordRun(wallet);
		recordRun(issuer);

		expect(runById(wallet.id)?.id).toBe(wallet.id);
		expect(runById(issuer.id)?.id).toBe(issuer.id);
	});

	it('returns undefined for an unknown id', () => {
		recordRun(walletRun('2026-06-01T00:00:00.000Z'));
		expect(runById('no-such-id')).toBeUndefined();
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
		expect(latestRunFor('verifier', 'credential-presentation', 'oid4')).toBeUndefined();
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

	it('does not read the legacy .v1 key', () => {
		backing.set(
			LEGACY_STORAGE_KEY,
			JSON.stringify({
				'wallet:credential-issuance:vcalm': [walletRun('2026-06-01T00:00:00.000Z')]
			})
		);
		expect(runsFor('wallet', 'credential-issuance', 'vcalm')).toEqual([]);
	});
});

describe('allLatestRuns', () => {
	it('returns one entry per combination keyed by runCombinationKey', () => {
		recordRun(walletRun('2026-06-01T00:00:00.000Z'));
		recordRun(walletRun('2026-06-02T00:00:00.000Z'));
		recordRun(issuerRun('2026-06-03T00:00:00.000Z'));

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

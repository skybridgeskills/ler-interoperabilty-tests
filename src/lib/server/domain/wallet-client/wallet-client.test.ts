import { describe, expect, it } from 'vitest';

import { statusFromWalletReport, testRunRecord } from '$lib/interop/run-history/index.js';
import { ExchangeChecker } from '$lib/server/domain/wallet-runner/index.js';

import { FakeWalletClient } from './fake-wallet-client.js';
import type { ProtocolDriver } from './protocol-driver.js';
import { RealWalletClient } from './wallet-client.js';

const exchange = { exchangeId: 'ex-1', protocols: { vcapi: 'https://tx.test/exchanges/ex-1' } };

describe('RealWalletClient', () => {
	it('dispatches to the registered driver and attaches a conformance report', async () => {
		const driver: ProtocolDriver = {
			async runAcceptance() {
				return {
					exchange: { state: 'complete' },
					credential: { proof: { cryptosuite: 'eddsa-rdfc-2022' } },
					verify: { verified: true, cryptosuite: 'eddsa-rdfc-2022' }
				};
			}
		};
		const client = RealWalletClient({ drivers: { vcalm: driver }, checker: ExchangeChecker() });
		const result = await client.acceptCredential({ profile: 'vcalm', exchange });

		expect(result.exchange.state).toBe('complete');
		expect(result.verify.verified).toBe(true);
		expect(result.report.verified).toBe(true);
		expect(result.report.groups.length).toBeGreaterThan(0);
	});

	it('throws when no driver is registered for the profile', async () => {
		const client = RealWalletClient({ drivers: {} });
		await expect(client.acceptCredential({ profile: 'vcalm', exchange })).rejects.toThrow(
			/no wallet protocol driver/i
		);
	});
});

describe('FakeWalletClient', () => {
	it('returns a deterministic completed-and-verified run', async () => {
		const result = await FakeWalletClient().acceptCredential({ profile: 'vcalm', exchange });
		expect(result.exchange.state).toBe('complete');
		expect(result.report.verified).toBe(true);
	});

	it('honors an override (e.g. a failing report)', async () => {
		const result = await FakeWalletClient({
			report: { verified: false, groups: [] }
		}).acceptCredential({ profile: 'vcalm', exchange });
		expect(result.report.verified).toBe(false);
	});
});

describe('wallet run record', () => {
	it('derives passed/failed/incomplete from exchange state + verified', () => {
		expect(statusFromWalletReport({ verified: true, exchangeState: 'complete' })).toBe('passed');
		expect(statusFromWalletReport({ verified: false, exchangeState: 'complete' })).toBe('failed');
		expect(statusFromWalletReport({ verified: true, exchangeState: 'pending' })).toBe('incomplete');
		expect(statusFromWalletReport({ verified: true, exchangeState: 'invalid' })).toBe('failed');
	});

	it('builds a valid wallet-report run record', () => {
		const record = testRunRecord({
			role: 'wallet',
			workflow: 'credential-acceptance',
			profile: 'vcalm',
			status: statusFromWalletReport({ verified: true, exchangeState: 'complete' }),
			checklistFingerprint: '',
			statuses: {}
		});
		expect(record.status).toBe('passed');
		expect(record).toMatchObject({ role: 'wallet', workflow: 'credential-acceptance' });
	});
});

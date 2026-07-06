import { describe, expect, it } from 'vitest';

import { ExchangeRunnerConfig } from '../domain/exchange-runner/exchange-runner-config.js';

import { configHealthCheck } from './config-health-check.js';

function config(overrides: Partial<ExchangeRunnerConfig> = {}): ExchangeRunnerConfig {
	return ExchangeRunnerConfig({
		enabled: true,
		transactionServiceUrl: 'https://tx.example.com',
		tenantName: 'default',
		tenantToken: 'a-real-token',
		exchangeHost: 'https://tx.example.com',
		...overrides
	});
}

describe('configHealthCheck', () => {
	it('reports UP when the exchange runner is disabled (no config required)', async () => {
		const result = await configHealthCheck(config({ enabled: false })).check();

		expect(result.status).toBe('UP');
		expect(result.details).toEqual({ exchangeRunnerEnabled: false });
	});

	it('reports DOWN when enabled but the transaction service URL is localhost', async () => {
		const result = await configHealthCheck(
			config({ transactionServiceUrl: 'http://localhost:4004' })
		).check();

		expect(result.status).toBe('DOWN');
		expect(result.error).toContain('not configured');
		expect(result.details).toEqual({ usingLocalhost: true, hasToken: true });
	});

	it('reports DOWN when enabled but the tenant token is empty', async () => {
		const result = await configHealthCheck(config({ tenantToken: '   ' })).check();

		expect(result.status).toBe('DOWN');
		expect(result.details).toEqual({ usingLocalhost: false, hasToken: false });
	});

	it('reports UP when enabled with a real URL and token', async () => {
		const result = await configHealthCheck(config()).check();

		expect(result.status).toBe('UP');
		expect(result.details).toEqual({ exchangeRunnerEnabled: true });
	});
});

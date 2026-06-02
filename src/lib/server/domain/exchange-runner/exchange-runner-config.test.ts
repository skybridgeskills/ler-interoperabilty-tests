import { describe, expect, it } from 'vitest';

import { parseExchangeRunnerConfig } from './exchange-runner-config.js';

describe('parseExchangeRunnerConfig', () => {
	it('uses defaults when env is empty', () => {
		const cfg = parseExchangeRunnerConfig({});
		expect(cfg.enabled).toBe(false);
		expect(cfg.transactionServiceUrl).toBe('http://localhost:4004');
		expect(cfg.tenantName).toBe('default');
		expect(cfg.tenantToken).toBe('');
		expect(cfg.exchangeHost).toBe('http://localhost:4004');
	});

	it('honors EXCHANGE_RUNNER_ENABLED=true', () => {
		expect(parseExchangeRunnerConfig({ EXCHANGE_RUNNER_ENABLED: 'true' }).enabled).toBe(true);
		expect(parseExchangeRunnerConfig({ EXCHANGE_RUNNER_ENABLED: '1' }).enabled).toBe(true);
		expect(parseExchangeRunnerConfig({ EXCHANGE_RUNNER_ENABLED: 'yes' }).enabled).toBe(true);
		expect(parseExchangeRunnerConfig({ EXCHANGE_RUNNER_ENABLED: 'false' }).enabled).toBe(false);
	});

	it('reads explicit URLs and tenant info', () => {
		const cfg = parseExchangeRunnerConfig({
			EXCHANGE_RUNNER_ENABLED: 'true',
			TRANSACTION_SERVICE_URL: 'http://lits.test:9999',
			TRANSACTION_SERVICE_TENANT_NAME: 'demo',
			TRANSACTION_SERVICE_TENANT_TOKEN: 'sekret',
			DEFAULT_EXCHANGE_HOST: 'https://example.ngrok-free.app'
		});
		expect(cfg).toEqual({
			enabled: true,
			transactionServiceUrl: 'http://lits.test:9999',
			tenantName: 'demo',
			tenantToken: 'sekret',
			exchangeHost: 'https://example.ngrok-free.app'
		});
	});

	it('defaults exchangeHost to the transaction-service URL when DEFAULT_EXCHANGE_HOST is missing', () => {
		const cfg = parseExchangeRunnerConfig({
			TRANSACTION_SERVICE_URL: 'http://lits.test:9999'
		});
		expect(cfg.exchangeHost).toBe('http://lits.test:9999');
	});

	it('rejects malformed URLs', () => {
		expect(() => parseExchangeRunnerConfig({ TRANSACTION_SERVICE_URL: 'not-a-url' })).toThrow();
	});
});

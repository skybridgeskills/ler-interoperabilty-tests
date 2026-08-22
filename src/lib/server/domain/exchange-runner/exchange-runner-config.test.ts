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
			exchangeHost: 'https://example.ngrok-free.app',
			cryptosuite: 'eddsa-rdfc-2022',
			didMethod: 'key',
			// The default tenant is also the first (and here only) entry of the
			// tenant list, so the top-level fields and the list never disagree.
			tenants: [
				{ name: 'demo', token: 'sekret', cryptosuite: 'eddsa-rdfc-2022', didMethod: 'key' }
			],
			badgeRootUrl: 'http://localhost:5173'
		});
	});

	describe('the tenant list', () => {
		it('holds the default tenant alone when nothing else is configured', () => {
			expect(parseExchangeRunnerConfig({}).tenants).toEqual([
				{ name: 'default', token: '', cryptosuite: 'eddsa-rdfc-2022', didMethod: 'key' }
			]);
		});

		it('reads additional tenants from the indexed family, default first', () => {
			const cfg = parseExchangeRunnerConfig({
				TRANSACTION_SERVICE_TENANT_NAME: 'demo',
				TRANSACTION_SERVICE_TENANT_TOKEN: 'sekret',
				TRANSACTION_SERVICE_TENANT_2_NAME: 'ecdsa',
				TRANSACTION_SERVICE_TENANT_2_TOKEN: 'sekret-2',
				TRANSACTION_SERVICE_TENANT_2_CRYPTOSUITE: 'ecdsa-rdfc-2019'
			});
			expect(cfg.tenants).toEqual([
				{ name: 'demo', token: 'sekret', cryptosuite: 'eddsa-rdfc-2022', didMethod: 'key' },
				{ name: 'ecdsa', token: 'sekret-2', cryptosuite: 'ecdsa-rdfc-2019', didMethod: 'key' }
			]);
		});

		it('stops scanning at the first absent name, as the upstream config does', () => {
			const cfg = parseExchangeRunnerConfig({
				// No _2_, so _3_ is never reached — a gap ends the list rather than
				// being skipped, which is how `TENANT_ISSUER_<n>_…` behaves upstream.
				TRANSACTION_SERVICE_TENANT_3_NAME: 'ecdsa',
				TRANSACTION_SERVICE_TENANT_3_TOKEN: 'sekret-3'
			});
			expect(cfg.tenants).toHaveLength(1);
		});

		it('drops a tenant configured without a token', () => {
			// Minting under an empty Bearer token fails at the service with an
			// opaque `unauthorized`. Dropping it makes a scenario pinned to that
			// suite render as unservable — a legible disabled row — instead.
			const cfg = parseExchangeRunnerConfig({
				TRANSACTION_SERVICE_TENANT_2_NAME: 'ecdsa',
				TRANSACTION_SERVICE_TENANT_2_CRYPTOSUITE: 'ecdsa-rdfc-2019'
			});
			expect(cfg.tenants).toHaveLength(1);
		});
	});

	it('reads BADGE_ROOT_URL as the badge id root, defaulting to the dev origin', () => {
		expect(parseExchangeRunnerConfig({}).badgeRootUrl).toBe('http://localhost:5173');
		expect(
			parseExchangeRunnerConfig({ BADGE_ROOT_URL: 'https://ler-tests.example' }).badgeRootUrl
		).toBe('https://ler-tests.example');
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

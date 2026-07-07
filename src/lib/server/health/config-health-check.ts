import type { ExchangeRunnerConfig } from '../domain/exchange-runner/exchange-runner-config.js';

import { HealthCheck, type HealthCheckResult } from './health-check.js';

/**
 * Config-only readiness (no network I/O): if the exchange runner is enabled it
 * must have a real transaction-service URL and a tenant token. Catches the
 * "empty URL / localhost fallback / empty token" misconfiguration.
 */
export function configHealthCheck(config: ExchangeRunnerConfig): HealthCheck {
	return HealthCheck({
		name: 'config',
		check: async (): Promise<HealthCheckResult> => {
			if (!config.enabled) {
				return { status: 'UP', details: { exchangeRunnerEnabled: false } };
			}
			const usingLocalhost = config.transactionServiceUrl.includes('localhost');
			const hasToken = config.tenantToken.trim() !== '';
			if (usingLocalhost || !hasToken) {
				return {
					status: 'DOWN',
					error: 'exchange runner enabled but transaction service is not configured',
					details: { usingLocalhost, hasToken }
				};
			}
			return { status: 'UP', details: { exchangeRunnerEnabled: true } };
		}
	});
}

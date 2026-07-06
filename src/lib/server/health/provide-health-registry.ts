import type { ExchangeRunnerConfig } from '../domain/exchange-runner/exchange-runner-config.js';

import { configHealthCheck } from './config-health-check.js';
import { HealthRegistry, type HealthRegistry as HealthRegistryType } from './health-registry.js';

export interface HealthRegistryCtx {
	healthRegistry: HealthRegistryType;
}

/**
 * Build a registry pre-registered with the single config-readiness check. This
 * app has exactly one check, so there is no symbol discovery step.
 */
export function provideHealthRegistry(config: ExchangeRunnerConfig): HealthRegistryCtx {
	const healthRegistry = HealthRegistry();
	healthRegistry.register(configHealthCheck(config));
	return { healthRegistry };
}

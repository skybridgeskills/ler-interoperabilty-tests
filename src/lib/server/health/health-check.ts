/**
 * Symbol-keyed property under which a service exposes its
 * `HealthCheck`. The `provideHealthRegistry` discovery step walks
 * top-level context values and pulls these out.
 */
export const HealthCheckSym: unique symbol = Symbol('healthCheck');

export type HealthStatus = 'UP' | 'DEGRADED' | 'DOWN';

export interface HealthCheckResult {
	status: HealthStatus;
	error?: string;
	details?: Record<string, unknown>;
}

export interface HealthCheck {
	name: string;
	check: () => Promise<HealthCheckResult>;
	timeoutMs?: number;
}

export function HealthCheck(opts: HealthCheck): HealthCheck {
	return opts;
}

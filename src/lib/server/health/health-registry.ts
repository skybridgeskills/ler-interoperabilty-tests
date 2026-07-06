import type { HealthCheck, HealthCheckResult, HealthStatus } from './health-check.js';

function nowMs(): number {
	return Date.now();
}

export interface HealthRegistryOpts {
	defaultTimeoutMs?: number;
	cacheTtlMs?: number;
}

export interface ComponentResult {
	status: HealthStatus;
	durationMs: number;
	error?: string;
	details?: Record<string, unknown>;
}

export interface RegistryRunResult {
	overall: HealthStatus;
	components: Record<string, ComponentResult>;
	runAtMs: number;
}

export interface HealthRegistry {
	register(check: HealthCheck): void;
	size(): number;
	runAll(): Promise<RegistryRunResult>;
}

export function HealthRegistry(opts: HealthRegistryOpts = {}): HealthRegistry {
	const defaultTimeoutMs = opts.defaultTimeoutMs ?? 2000;
	const cacheTtlMs = opts.cacheTtlMs ?? 5000;

	const checks: HealthCheck[] = [];
	let cached: RegistryRunResult | undefined;
	let inFlight: Promise<RegistryRunResult> | undefined;

	function register(check: HealthCheck) {
		checks.push(check);
	}

	function size() {
		return checks.length;
	}

	async function runAll(): Promise<RegistryRunResult> {
		const t = nowMs();
		if (cached && t - cached.runAtMs < cacheTtlMs) {
			return cached;
		}
		if (inFlight) {
			return inFlight;
		}

		inFlight = (async () => {
			const startedAt = nowMs();
			const componentEntries = await Promise.all(
				checks.map(async (check): Promise<[string, ComponentResult]> => {
					const result = await runOneCheck(check, defaultTimeoutMs);
					return [check.name, result];
				})
			);

			const components: Record<string, ComponentResult> = Object.fromEntries(componentEntries);
			const overall = aggregateStatus(componentEntries.map(([, r]) => r.status));

			const result: RegistryRunResult = {
				overall,
				components,
				runAtMs: startedAt
			};
			cached = result;
			return result;
		})();

		try {
			return await inFlight;
		} finally {
			inFlight = undefined;
		}
	}

	return { register, size, runAll };
}

async function runOneCheck(check: HealthCheck, defaultTimeoutMs: number): Promise<ComponentResult> {
	const timeoutMs = check.timeoutMs ?? defaultTimeoutMs;
	const startedAt = nowMs();

	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeoutPromise = new Promise<HealthCheckResult>((resolve) => {
		timer = setTimeout(() => resolve({ status: 'DOWN', error: 'timeout' }), timeoutMs);
	});

	let raw: HealthCheckResult;
	try {
		raw = await Promise.race([check.check(), timeoutPromise]);
	} catch (err) {
		raw = { status: 'DOWN', error: err instanceof Error ? err.message : String(err) };
	} finally {
		if (timer) clearTimeout(timer);
	}

	return {
		status: raw.status,
		durationMs: nowMs() - startedAt,
		...(raw.error !== undefined ? { error: raw.error } : {}),
		...(raw.details !== undefined ? { details: raw.details } : {})
	};
}

function aggregateStatus(statuses: HealthStatus[]): HealthStatus {
	if (statuses.some((s) => s === 'DOWN')) return 'DOWN';
	if (statuses.some((s) => s === 'DEGRADED')) return 'DEGRADED';
	return 'UP';
}

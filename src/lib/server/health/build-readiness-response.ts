import type { AppContext } from '../app-context.js';
import { appVersion } from '../util/app-version.js';
import { providerCtxSafe } from '../util/provider/provider-ctx.js';

import type { HealthStatus } from './health-check.js';
import type { HealthRegistry } from './health-registry.js';
import type { ReadinessHttpResult, ReadinessResponse } from './readiness-response.js';

const processStartedAt = new Date();

function deploymentEnvironment(env: NodeJS.ProcessEnv = process.env): string {
	return env.ENV_NAME?.trim() || env.CONTEXT?.trim() || 'unknown';
}

function timestampIso(): string {
	const ctx = providerCtxSafe<AppContext>();
	const ms = ctx?.timeService?.nowMs();
	return new Date(ms ?? Date.now()).toISOString();
}

/**
 * Readiness body + HTTP status for `GET /health/ready` (OTel-style envelope).
 * Reads the health registry from the per-request AppContext (this app always
 * runs handlers inside `runInContext`).
 */
export async function buildReadinessResponse(): Promise<ReadinessHttpResult> {
	const version = appVersion();
	const registry = providerCtxSafe<AppContext>().healthRegistry as HealthRegistry | undefined;

	if (!registry) {
		const body: ReadinessResponse = {
			status: 'DOWN',
			'service.name': 'ler-tests',
			'service.version': version.version,
			'deployment.environment': deploymentEnvironment(),
			startupTime: processStartedAt.toISOString(),
			timestamp: timestampIso(),
			components: {
				registry: {
					status: 'DOWN',
					durationMs: 0,
					error: 'Health registry not initialized'
				}
			}
		};
		return { body, httpStatus: 503 };
	}

	const run = await registry.runAll();

	const components = Object.fromEntries(
		Object.entries(run.components).map(([name, c]) => [
			name,
			{
				status: c.status,
				durationMs: c.durationMs,
				...(c.error !== undefined ? { error: c.error } : {}),
				...(c.details !== undefined ? { details: c.details } : {})
			}
		])
	);

	const body: ReadinessResponse = {
		status: run.overall,
		'service.name': 'ler-tests',
		'service.version': version.version,
		'deployment.environment': deploymentEnvironment(),
		startupTime: processStartedAt.toISOString(),
		timestamp: timestampIso(),
		components
	};

	return { body, httpStatus: httpStatusFor(run.overall) };
}

function httpStatusFor(overall: HealthStatus): 200 | 503 {
	return overall === 'DOWN' ? 503 : 200;
}

import { hostname } from 'node:os';

import type { LoggerService } from '../services/logging/logger-service.js';
import { appVersion } from '../util/app-version.js';

import type { ComponentResult, RegistryRunResult } from './health-registry.js';

export interface HealthSnapshotLog {
	'service.name': string;
	service_name: string;
	'service.version': string;
	service_version: string;
	'deployment.environment': string;
	deployment_environment: string;
	'service.instance.id': string;
	service_instance_id: string;
	event: 'health-snapshot';
	health: true;
	readiness: boolean;
	status: RegistryRunResult['overall'];
	componentCount: number;
	components: Record<string, Pick<ComponentResult, 'durationMs' | 'status'>>;
	intervalMs: number;
}

export interface HealthSnapshotLogOpts {
	env?: NodeJS.ProcessEnv;
	intervalMs: number;
	run: RegistryRunResult;
}

export function buildHealthSnapshotLog(opts: HealthSnapshotLogOpts): HealthSnapshotLog {
	const env = opts.env ?? process.env;
	const serviceName = env.APP_NAME?.trim() || 'ler-tests';
	const serviceVersion = env.APP_VERSION?.trim() || appVersion().version;
	const deploymentEnvironment = env.ENV_NAME?.trim() || env.CONTEXT?.trim() || 'unknown';
	const serviceInstanceId = env.SERVICE_INSTANCE_ID?.trim() || hostname();

	return {
		'service.name': serviceName,
		service_name: serviceName,
		'service.version': serviceVersion,
		service_version: serviceVersion,
		'deployment.environment': deploymentEnvironment,
		deployment_environment: deploymentEnvironment,
		'service.instance.id': serviceInstanceId,
		service_instance_id: serviceInstanceId,
		event: 'health-snapshot',
		health: true,
		readiness: opts.run.overall !== 'DOWN',
		status: opts.run.overall,
		componentCount: Object.keys(opts.run.components).length,
		components: compactComponents(opts.run.components),
		intervalMs: opts.intervalMs
	};
}

export function logHealthSnapshot(logger: LoggerService, opts: HealthSnapshotLogOpts): void {
	logger.info(buildHealthSnapshotLog(opts), 'health-snapshot');
}

function compactComponents(
	components: RegistryRunResult['components']
): HealthSnapshotLog['components'] {
	return Object.fromEntries(
		Object.entries(components).map(([name, component]) => [
			name,
			{
				status: component.status,
				durationMs: component.durationMs
			}
		])
	);
}

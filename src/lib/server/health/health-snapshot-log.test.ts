import { hostname } from 'node:os';

import { describe, expect, it, vi } from 'vitest';

import type { LoggerService } from '../services/logging/logger-service.js';

import type { RegistryRunResult } from './health-registry.js';
import { buildHealthSnapshotLog, logHealthSnapshot } from './health-snapshot-log.js';

const run: RegistryRunResult = {
	overall: 'DEGRADED',
	runAtMs: 1_776_720_000_000,
	components: {
		config: { status: 'DEGRADED', durationMs: 3, error: 'ignored', details: { dropped: true } }
	}
};

const env: NodeJS.ProcessEnv = {
	APP_NAME: 'ler-tests',
	APP_VERSION: '9.9.9',
	ENV_NAME: 'staging',
	SERVICE_INSTANCE_ID: 'instance-7'
};

describe('buildHealthSnapshotLog', () => {
	it('emits the full field set incl. dotted AND snake_case duplicates', () => {
		const log = buildHealthSnapshotLog({ env, run, intervalMs: 60_000 });

		expect(log['service.name']).toBe('ler-tests');
		expect(log.service_name).toBe('ler-tests');
		expect(log['service.version']).toBe('9.9.9');
		expect(log.service_version).toBe('9.9.9');
		expect(log['deployment.environment']).toBe('staging');
		expect(log.deployment_environment).toBe('staging');
		expect(log['service.instance.id']).toBe('instance-7');
		expect(log.service_instance_id).toBe('instance-7');
	});

	it('sets the fixed event/health markers and derives readiness from overall', () => {
		const log = buildHealthSnapshotLog({ env, run, intervalMs: 30_000 });

		expect(log.event).toBe('health-snapshot');
		expect(log.health).toBe(true);
		expect(log.status).toBe('DEGRADED');
		expect(log.readiness).toBe(true); // DEGRADED is still ready
		expect(log.componentCount).toBe(1);
		expect(log.intervalMs).toBe(30_000);
	});

	it('marks readiness false only when overall is DOWN', () => {
		const down = buildHealthSnapshotLog({
			env,
			intervalMs: 1_000,
			run: { overall: 'DOWN', runAtMs: 0, components: {} }
		});
		expect(down.readiness).toBe(false);
		expect(down.status).toBe('DOWN');
	});

	it('compacts components down to { status, durationMs } only', () => {
		const log = buildHealthSnapshotLog({ env, run, intervalMs: 60_000 });

		expect(log.components).toEqual({
			config: { status: 'DEGRADED', durationMs: 3 }
		});
	});

	it('falls back to ler-tests / appVersion / CONTEXT / hostname defaults', () => {
		const log = buildHealthSnapshotLog({ env: { CONTEXT: 'dev' }, run, intervalMs: 60_000 });

		expect(log.service_name).toBe('ler-tests');
		expect(log.service_version.length).toBeGreaterThan(0);
		expect(log.deployment_environment).toBe('dev');
		expect(log.service_instance_id).toBe(hostname());
	});
});

describe('logHealthSnapshot', () => {
	it('logs at info with the "health-snapshot" message and the snapshot object', () => {
		const info = vi.fn();
		const logger = { info } as unknown as LoggerService;

		logHealthSnapshot(logger, { env, run, intervalMs: 60_000 });

		expect(info).toHaveBeenCalledTimes(1);
		const [obj, msg] = info.mock.calls[0] as [Record<string, unknown>, string];
		expect(msg).toBe('health-snapshot');
		expect(obj.event).toBe('health-snapshot');
		expect(obj.service_name).toBe('ler-tests');
	});
});

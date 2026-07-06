import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LoggerService } from '../services/logging/logger-service.js';

import type { HealthRegistry, RegistryRunResult } from './health-registry.js';
import { provideHealthLogging } from './provide-health-logging.js';

function captureLogger() {
	const info = vi.fn();
	const warn = vi.fn();
	const logger = { info, warn } as unknown as LoggerService;
	return { logger, info, warn };
}

const upResult: RegistryRunResult = {
	overall: 'UP',
	runAtMs: 1_776_720_000_000,
	components: { config: { status: 'UP', durationMs: 2 } }
};

const env: NodeJS.ProcessEnv = {
	APP_NAME: 'ler-tests',
	APP_VERSION: '1.2.3',
	ENV_NAME: 'staging',
	SERVICE_INSTANCE_ID: 'test-instance'
};

describe('provideHealthLogging', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('emits on the initial delay then every interval and returns a Symbol.dispose stopper', async () => {
		vi.useFakeTimers();
		const { logger, info } = captureLogger();
		const runAll = vi.fn().mockResolvedValue(upResult);

		const provider = provideHealthLogging(
			{ logger, healthRegistry: { runAll } as unknown as HealthRegistry },
			{ initialDelayMs: 10, intervalMs: 1_000, env }
		);

		expect(provider[Symbol.dispose]).toEqual(expect.any(Function));
		expect(runAll).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(10);
		expect(runAll).toHaveBeenCalledTimes(1);
		expect(info).toHaveBeenCalledTimes(1);
		const [obj, msg] = info.mock.calls[0] as [Record<string, unknown>, string];
		expect(msg).toBe('health-snapshot');
		expect(obj).toMatchObject({
			event: 'health-snapshot',
			service_name: 'ler-tests',
			service_version: '1.2.3',
			deployment_environment: 'staging',
			service_instance_id: 'test-instance',
			status: 'UP',
			readiness: true,
			componentCount: 1,
			intervalMs: 1_000
		});

		await vi.advanceTimersByTimeAsync(1_000);
		expect(runAll).toHaveBeenCalledTimes(2);

		provider[Symbol.dispose]();
		await vi.advanceTimersByTimeAsync(5_000);
		expect(runAll).toHaveBeenCalledTimes(2);
	});

	it('uses the injected random to jitter the initial delay', async () => {
		vi.useFakeTimers();
		const { logger } = captureLogger();
		const runAll = vi.fn().mockResolvedValue(upResult);

		provideHealthLogging(
			{ logger, healthRegistry: { runAll } as unknown as HealthRegistry },
			{ intervalMs: 1_000, random: () => 0.5, env }
		);

		await vi.advanceTimersByTimeAsync(499);
		expect(runAll).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);
		expect(runAll).toHaveBeenCalledTimes(1);
	});

	it('does not schedule when HEALTH_SNAPSHOT_ENABLED=false', async () => {
		vi.useFakeTimers();
		const { logger } = captureLogger();
		const runAll = vi.fn();

		const provider = provideHealthLogging(
			{ logger, healthRegistry: { runAll } as unknown as HealthRegistry },
			{ env: { HEALTH_SNAPSHOT_ENABLED: 'false' } }
		);

		await vi.advanceTimersByTimeAsync(120_000);
		provider[Symbol.dispose]();
		expect(runAll).not.toHaveBeenCalled();
	});

	it('does not schedule when HEALTH_SNAPSHOT_INTERVAL_MS <= 0', async () => {
		vi.useFakeTimers();
		const { logger } = captureLogger();
		const runAll = vi.fn();

		const provider = provideHealthLogging(
			{ logger, healthRegistry: { runAll } as unknown as HealthRegistry },
			{ env: { HEALTH_SNAPSHOT_INTERVAL_MS: '0' } }
		);

		await vi.advanceTimersByTimeAsync(120_000);
		provider[Symbol.dispose]();
		expect(runAll).not.toHaveBeenCalled();
	});

	it('logs a warning and keeps looping when runAll throws', async () => {
		vi.useFakeTimers();
		const { logger, warn, info } = captureLogger();
		const runAll = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(upResult);

		const provider = provideHealthLogging(
			{ logger, healthRegistry: { runAll } as unknown as HealthRegistry },
			{ initialDelayMs: 10, intervalMs: 1_000, env }
		);

		await vi.advanceTimersByTimeAsync(10);
		expect(runAll).toHaveBeenCalledTimes(1);
		expect(warn).toHaveBeenCalledTimes(1);
		const [warnObj, warnMsg] = warn.mock.calls[0] as [Record<string, unknown>, string];
		expect(warnMsg).toBe('health-snapshot failed');
		expect(warnObj).toHaveProperty('err');
		expect(info).not.toHaveBeenCalled();

		// The loop keeps going: next tick succeeds and logs.
		await vi.advanceTimersByTimeAsync(1_000);
		expect(runAll).toHaveBeenCalledTimes(2);
		expect(info).toHaveBeenCalledTimes(1);

		provider[Symbol.dispose]();
	});
});

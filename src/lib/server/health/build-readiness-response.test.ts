import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { runInContext } from '../util/provider/provider-ctx.js';

import { buildReadinessResponse } from './build-readiness-response.js';
import type { HealthRegistry, RegistryRunResult } from './health-registry.js';

const fixedNow = new Date('2026-04-22T10:05:00.000Z');

function fakeRegistry(result: RegistryRunResult): HealthRegistry {
	return {
		register: () => {},
		size: () => Object.keys(result.components).length,
		runAll: async () => result
	};
}

const baseCtx = (registry: HealthRegistry) => ({
	healthRegistry: registry,
	timeService: {
		now: () => fixedNow,
		nowMs: () => fixedNow.getTime()
	}
});

describe('buildReadinessResponse', () => {
	const prevContext = process.env.CONTEXT;

	beforeEach(() => {
		process.env.CONTEXT = 'hosted';
	});

	afterEach(() => {
		process.env.CONTEXT = prevContext;
	});

	it('returns the OTel envelope + components map for an all-UP system, status 200', async () => {
		const reg = fakeRegistry({
			overall: 'UP',
			runAtMs: fixedNow.getTime(),
			components: {
				config: { status: 'UP', durationMs: 1, details: { exchangeRunnerEnabled: true } }
			}
		});
		const r = await runInContext(baseCtx(reg), () => buildReadinessResponse());

		expect(r.httpStatus).toBe(200);
		expect(r.body.status).toBe('UP');
		expect(r.body['service.name']).toBe('ler-tests');
		expect(r.body['service.version'].length).toBeGreaterThan(0);
		expect(r.body['deployment.environment']).toBe('hosted');
		expect(r.body.timestamp).toBe(fixedNow.toISOString());
		expect(r.body.startupTime).toBeDefined();
		expect(r.body.components).toEqual({
			config: { status: 'UP', durationMs: 1, details: { exchangeRunnerEnabled: true } }
		});
	});

	it('keeps httpStatus 200 on overall DEGRADED', async () => {
		const reg = fakeRegistry({
			overall: 'DEGRADED',
			runAtMs: fixedNow.getTime(),
			components: { config: { status: 'DEGRADED', durationMs: 2, error: 'soft' } }
		});
		const r = await runInContext(baseCtx(reg), () => buildReadinessResponse());

		expect(r.body.status).toBe('DEGRADED');
		expect(r.httpStatus).toBe(200);
		expect(r.body.components.config?.error).toBe('soft');
	});

	it('returns httpStatus 503 on overall DOWN', async () => {
		const reg = fakeRegistry({
			overall: 'DOWN',
			runAtMs: fixedNow.getTime(),
			components: { config: { status: 'DOWN', durationMs: 1, error: 'not configured' } }
		});
		const r = await runInContext(baseCtx(reg), () => buildReadinessResponse());

		expect(r.httpStatus).toBe(503);
		expect(r.body.status).toBe('DOWN');
	});

	it('omits error/details fields when the check did not provide them', async () => {
		const reg = fakeRegistry({
			overall: 'UP',
			runAtMs: fixedNow.getTime(),
			components: { config: { status: 'UP', durationMs: 1 } }
		});
		const r = await runInContext(baseCtx(reg), () => buildReadinessResponse());

		expect(Object.keys(r.body.components.config ?? {}).sort()).toEqual(
			['durationMs', 'status'].sort()
		);
	});

	it('returns DOWN 503 when the registry is not in context', async () => {
		const r = await runInContext(
			{ timeService: { now: () => fixedNow, nowMs: () => fixedNow.getTime() } },
			() => buildReadinessResponse()
		);

		expect(r.httpStatus).toBe(503);
		expect(r.body.status).toBe('DOWN');
		expect(r.body.components.registry?.error).toBe('Health registry not initialized');
	});
});

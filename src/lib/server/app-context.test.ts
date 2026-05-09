import { describe, expect, it } from 'vitest';

import { appContext } from './app-context.js';
import { buildAppContext } from './build-app-context.js';
import { DevAppContext } from './dev-app-context.js';
import { runInContext } from './util/provider/provider-ctx.js';

describe('DevAppContext', () => {
	it('returns logger + timeService + idService', () => {
		const ctx = DevAppContext({ LOG_LEVEL: 'silent' });
		expect(typeof ctx.logger.info).toBe('function');
		expect(typeof ctx.timeService.nowMs).toBe('function');
		expect(typeof ctx.idService.uuid).toBe('function');
	});
});

describe('buildAppContext', () => {
	it('builds the test context when CONTEXT=test', async () => {
		const ctx = await buildAppContext({ CONTEXT: 'test' });
		// FakeIdService is monotonic from 1
		expect(ctx.idService.uuid()).toBe('00000000-0000-0000-0000-000000000001');
	});

	it('defaults to dev when CONTEXT is missing', async () => {
		const ctx = await buildAppContext({ LOG_LEVEL: 'silent' });
		expect(typeof ctx.logger.info).toBe('function');
		// Real id service produces a v4-shaped UUID
		expect(ctx.idService.uuid()).toMatch(/^[0-9a-f-]{36}$/i);
	});
});

describe('appContext()', () => {
	it('throws when called outside a runInContext scope', () => {
		expect(() => appContext()).toThrow(/No app context present/);
	});

	it('returns the wired context inside runInContext', async () => {
		const ctx = await buildAppContext({ CONTEXT: 'test' });
		runInContext(ctx, () => {
			const seen = appContext();
			expect(seen.logger).toBe(ctx.logger);
			expect(seen.timeService).toBe(ctx.timeService);
			expect(seen.idService).toBe(ctx.idService);
		});
	});
});

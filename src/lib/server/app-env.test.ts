import { describe, expect, it } from 'vitest';

import { parseBaseEnv } from './app-env.js';

describe('parseBaseEnv', () => {
	it('defaults CONTEXT to dev when missing', () => {
		const parsed = parseBaseEnv({});
		expect(parsed.CONTEXT).toBe('dev');
	});

	it('accepts test CONTEXT', () => {
		const parsed = parseBaseEnv({ CONTEXT: 'test' });
		expect(parsed.CONTEXT).toBe('test');
	});

	it('rejects unknown CONTEXT values', () => {
		expect(() => parseBaseEnv({ CONTEXT: 'prod' })).toThrow();
	});

	it('passes LOG_LEVEL through', () => {
		const parsed = parseBaseEnv({ CONTEXT: 'dev', LOG_LEVEL: 'debug' });
		expect(parsed.LOG_LEVEL).toBe('debug');
	});
});

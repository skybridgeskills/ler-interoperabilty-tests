import { describe, expect, it } from 'vitest';

import { PinoLoggerService, SilentLoggerService } from './logger-service.js';

describe('SilentLoggerService', () => {
	it('exposes the LoggerService surface without throwing', () => {
		const logger = SilentLoggerService();
		expect(() => logger.info({}, 'hello')).not.toThrow();
		expect(() => logger.warn({}, 'hello')).not.toThrow();
		expect(() => logger.error({}, 'hello')).not.toThrow();
		expect(() => logger.debug({}, 'hello')).not.toThrow();
	});

	it('produces a child logger with the same surface', () => {
		const logger = SilentLoggerService();
		const child = logger.child({ requestId: 'abc' });
		expect(typeof child.info).toBe('function');
		expect(typeof child.child).toBe('function');
	});
});

describe('PinoLoggerService', () => {
	it('builds a logger at the requested level', () => {
		const logger = PinoLoggerService({ level: 'silent' });
		expect(typeof logger.info).toBe('function');
	});
});

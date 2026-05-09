import { describe, expect, it } from 'vitest';

import { asFakeTimeService, FakeTimeService, RealTimeService } from './time-service.js';

describe('RealTimeService', () => {
	it('returns roughly-now', () => {
		const service = RealTimeService();
		const before = Date.now();
		const ms = service.nowMs();
		const after = Date.now();
		expect(ms).toBeGreaterThanOrEqual(before);
		expect(ms).toBeLessThanOrEqual(after);
	});

	it('returns a Date matching nowMs', () => {
		const service = RealTimeService();
		const date = service.now();
		expect(date).toBeInstanceOf(Date);
	});
});

describe('FakeTimeService', () => {
	it('starts at the given initial time', () => {
		const service = FakeTimeService(new Date('2026-05-09T00:00:00Z'));
		expect(service.now().toISOString()).toBe('2026-05-09T00:00:00.000Z');
	});

	it('advance() moves time forward by deltaMs', () => {
		const service = FakeTimeService(0);
		service.advance(1000);
		expect(service.nowMs()).toBe(1000);
		service.advance(500);
		expect(service.nowMs()).toBe(1500);
	});

	it('set() jumps to an explicit instant', () => {
		const service = FakeTimeService(0);
		service.set(new Date('2030-01-01T00:00:00Z'));
		expect(service.now().toISOString()).toBe('2030-01-01T00:00:00.000Z');
	});

	it('asFakeTimeService recovers the fake surface', () => {
		const service = FakeTimeService(0);
		const fake = asFakeTimeService(service);
		fake.advance(10);
		expect(service.nowMs()).toBe(10);
	});

	it('asFakeTimeService throws on a real service', () => {
		expect(() => asFakeTimeService(RealTimeService())).toThrow();
	});
});

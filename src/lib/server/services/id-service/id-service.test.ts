import { describe, expect, it } from 'vitest';

import { FakeIdService, RealIdService } from './id-service.js';

describe('RealIdService', () => {
	it('uuid() returns a v4-shaped string', () => {
		const service = RealIdService();
		const id = service.uuid();
		expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
	});

	it('uuid() returns distinct values', () => {
		const service = RealIdService();
		expect(service.uuid()).not.toBe(service.uuid());
	});

	it('short() prefixes the requested prefix', () => {
		const service = RealIdService();
		expect(service.short('req')).toMatch(/^req-[0-9a-f]{8}$/i);
	});
});

describe('FakeIdService', () => {
	it('produces deterministic, monotonic UUIDs', () => {
		const service = FakeIdService();
		expect(service.uuid()).toBe('00000000-0000-0000-0000-000000000001');
		expect(service.uuid()).toBe('00000000-0000-0000-0000-000000000002');
		expect(service.uuid()).toBe('00000000-0000-0000-0000-000000000003');
	});

	it('short() uses the same shared counter', () => {
		const service = FakeIdService();
		service.uuid();
		expect(service.short('req')).toBe('req-00000002');
	});
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { pollExchange, type ExchangePollResponse } from './poll-exchange.js';

const successBody: ExchangePollResponse = {
	exchange: { exchangeId: 'x', state: 'pending' },
	derived: { run: 'awaiting-wallet', perStep: ['in-flight', 'pending'] }
};

const completeBody: ExchangePollResponse = {
	exchange: { exchangeId: 'x', state: 'complete' },
	derived: { run: 'complete', perStep: ['complete', 'complete'] }
};

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe('pollExchange', () => {
	it('fires immediately and on each interval', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
			async () =>
				new Response(JSON.stringify(successBody), {
					status: 200,
					headers: { 'content-type': 'application/json' }
				})
		);
		const onUpdate = vi.fn();
		const handle = pollExchange('x', { onUpdate }, { intervalMs: 100, timeoutMs: 1000 });

		// Tick zero: fired immediately.
		await vi.advanceTimersByTimeAsync(0);
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(onUpdate).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(100);
		expect(fetchSpy).toHaveBeenCalledTimes(2);

		await vi.advanceTimersByTimeAsync(100);
		expect(fetchSpy).toHaveBeenCalledTimes(3);

		handle.stop();
	});

	it('stops automatically when run="complete"', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
			async () =>
				new Response(JSON.stringify(completeBody), {
					status: 200,
					headers: { 'content-type': 'application/json' }
				})
		);
		const onUpdate = vi.fn();
		pollExchange('x', { onUpdate }, { intervalMs: 100, timeoutMs: 1000 });

		await vi.advanceTimersByTimeAsync(0);
		await vi.advanceTimersByTimeAsync(500);

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(onUpdate).toHaveBeenCalledWith(completeBody);
	});

	it('calls onTimeout when timeout elapses', async () => {
		vi.spyOn(globalThis, 'fetch').mockImplementation(
			async () =>
				new Response(JSON.stringify(successBody), {
					status: 200,
					headers: { 'content-type': 'application/json' }
				})
		);
		const onUpdate = vi.fn();
		const onTimeout = vi.fn();
		pollExchange('x', { onUpdate, onTimeout }, { intervalMs: 1000, timeoutMs: 250 });

		await vi.advanceTimersByTimeAsync(300);
		expect(onTimeout).toHaveBeenCalledOnce();
	});

	it('stops polling after a fatal HTTP error', async () => {
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockImplementation(async () => new Response('boom', { status: 502 }));
		const onUpdate = vi.fn();
		const onError = vi.fn();
		pollExchange('x', { onUpdate, onError }, { intervalMs: 100, timeoutMs: 5000 });

		await vi.advanceTimersByTimeAsync(0);
		expect(onError).toHaveBeenCalledWith(
			expect.objectContaining({ kind: 'http-error', status: 502 })
		);
		expect(fetchSpy).toHaveBeenCalledTimes(1);

		// No re-fire after a fatal error.
		await vi.advanceTimersByTimeAsync(500);
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});

	it('stops polling after a fatal network error', async () => {
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockImplementation(async () => Promise.reject(new Error('network down')));
		const onUpdate = vi.fn();
		const onError = vi.fn();
		pollExchange('x', { onUpdate, onError }, { intervalMs: 100, timeoutMs: 5000 });

		await vi.advanceTimersByTimeAsync(0);
		expect(onError).toHaveBeenCalledWith(
			expect.objectContaining({ kind: 'fetch-error', message: 'network down' })
		);
		expect(fetchSpy).toHaveBeenCalledTimes(1);

		// No re-fire after a fatal error.
		await vi.advanceTimersByTimeAsync(500);
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});

	it('respects an AbortSignal', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
			async () =>
				new Response(JSON.stringify(successBody), {
					status: 200,
					headers: { 'content-type': 'application/json' }
				})
		);
		const ctrl = new AbortController();
		const onUpdate = vi.fn();
		pollExchange('x', { onUpdate }, { intervalMs: 100, timeoutMs: 1000, signal: ctrl.signal });

		await vi.advanceTimersByTimeAsync(0);
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		ctrl.abort();
		await vi.advanceTimersByTimeAsync(500);
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});
});

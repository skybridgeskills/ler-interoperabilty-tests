import type { RunStateDerivation } from '$lib/interop/runner-state.js';
import type { ExchangeRecord } from '$lib/server/domain/exchange-runner/transaction-service-client.js';

export type ExchangePollResponse = {
	exchange: ExchangeRecord;
	derived: RunStateDerivation;
};

export type PollExchangeCallbacks = {
	onUpdate: (response: ExchangePollResponse) => void;
	onError?: (error: ExchangePollError) => void;
	onTimeout?: () => void;
};

export type PollExchangeOptions = {
	/** Polling interval in ms. Default 2000. */
	intervalMs?: number;
	/** Total timeout in ms. Default 5 * 60 * 1000. */
	timeoutMs?: number;
	/** Step count for the run-state derivation. Default 5. */
	stepCount?: number;
	/** Optional AbortSignal for cancellation. */
	signal?: AbortSignal;
};

export type ExchangePollError = {
	kind: 'fetch-error' | 'http-error';
	status?: number;
	message: string;
};

/**
 * Browser-only helper that polls `/api/exchange-runner/[exchangeId]` until
 * the exchange completes, becomes invalid, or the caller aborts/times out.
 *
 * Returns a `stop` function for callers that want to tear down without
 * an `AbortController`.
 */
export function pollExchange(
	exchangeId: string,
	callbacks: PollExchangeCallbacks,
	options: PollExchangeOptions = {}
): { stop: () => void } {
	const intervalMs = options.intervalMs ?? 2000;
	const timeoutMs = options.timeoutMs ?? 5 * 60 * 1000;
	const stepCount = options.stepCount ?? 5;
	const url = `/api/exchange-runner/${encodeURIComponent(exchangeId)}?stepCount=${stepCount}`;

	let stopped = false;
	const handles: {
		interval?: ReturnType<typeof setInterval>;
		timeout?: ReturnType<typeof setTimeout>;
	} = {};

	const stop = () => {
		if (stopped) return;
		stopped = true;
		if (handles.interval !== undefined) clearInterval(handles.interval);
		if (handles.timeout !== undefined) clearTimeout(handles.timeout);
	};

	if (options.signal) {
		if (options.signal.aborted) {
			stop();
			return { stop };
		}
		options.signal.addEventListener('abort', stop, { once: true });
	}

	const tick = async () => {
		if (stopped) return;
		try {
			const res = await fetch(url, { headers: { Accept: 'application/json' } });
			if (stopped) return;
			if (!res.ok) {
				callbacks.onError?.({
					kind: 'http-error',
					status: res.status,
					message: `Exchange poll responded ${res.status}`
				});
				return;
			}
			const body = (await res.json()) as ExchangePollResponse;
			callbacks.onUpdate(body);
			if (body.derived.run === 'complete' || body.derived.run === 'error') {
				stop();
			}
		} catch (e) {
			if (stopped) return;
			callbacks.onError?.({
				kind: 'fetch-error',
				message: e instanceof Error ? e.message : String(e)
			});
		}
	};

	// Fire immediately so the UI sees fresh state on tick zero.
	void tick();
	handles.interval = setInterval(tick, intervalMs);
	handles.timeout = setTimeout(() => {
		if (stopped) return;
		callbacks.onTimeout?.();
		stop();
	}, timeoutMs);

	return { stop };
}

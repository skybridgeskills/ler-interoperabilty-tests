/**
 * Source of current time. Inject via the provider system so tests get a
 * deterministic clock without monkey-patching globals.
 */
export interface TimeService {
	now: () => Date;
	nowMs: () => number;
}

/**
 * Test-only mutators on the fake clock. The factory returns an object that
 * additionally carries `advance` and `set`, narrowed to `TimeService` for the
 * common case and recovered via {@link asFakeTimeService} when tests need to
 * move time forward.
 */
export interface FakeTimeService extends TimeService {
	advance: (deltaMs: number) => void;
	set: (next: Date | number) => void;
}

/** Real clock backed by `Date.now()`. */
export function RealTimeService(): TimeService {
	return {
		now: () => new Date(),
		nowMs: () => Date.now()
	};
}

/**
 * Deterministic clock for tests. Initial defaults to epoch zero; use
 * `advance(ms)` or `set(date)` to move it.
 */
export function FakeTimeService(initial: Date | number = 0): FakeTimeService {
	let ms = typeof initial === 'number' ? initial : initial.getTime();
	return {
		now: () => new Date(ms),
		nowMs: () => ms,
		advance: (deltaMs: number) => {
			ms += deltaMs;
		},
		set: (next: Date | number) => {
			ms = typeof next === 'number' ? next : next.getTime();
		}
	};
}

/**
 * Recover the FakeTimeService surface from a TimeService when you control the
 * provider chain. Throws at runtime if the underlying service is real.
 */
export function asFakeTimeService(service: TimeService): FakeTimeService {
	if (typeof (service as FakeTimeService).advance !== 'function') {
		throw new Error('asFakeTimeService called on a non-fake TimeService');
	}
	return service as FakeTimeService;
}

import { providerCtx } from '$lib/server/util/provider/provider-ctx.js';

import { FakeTimeService, RealTimeService, type TimeService } from './time-service.js';

/** Wires the real wall-clock TimeService. */
export function provideTimeService() {
	return { timeService: RealTimeService() };
}

/** Provider factory for the deterministic test clock. */
export function FakeTimeServiceProvider(initial?: Date | number) {
	return () => ({ timeService: FakeTimeService(initial ?? 0) });
}

export type TimeServiceCtx = { timeService: TimeService };

/** Thin accessor for use inside `runInContext`. */
export function timeService(): TimeService {
	return providerCtx<TimeServiceCtx>().timeService;
}

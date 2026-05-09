import type { AppContext } from './app-context.js';
import { FakeIdService } from './services/id-service/id-service.js';
import { SilentLoggerService } from './services/logging/logger-service.js';
import { FakeTimeService } from './services/time-service/time-service.js';

/** Builds the test AppContext: silent logger, fixed clock, deterministic IDs. */
export function TestAppContext(_env: Record<string, unknown>): AppContext {
	return {
		logger: SilentLoggerService(),
		timeService: FakeTimeService(new Date('2026-05-09T00:00:00Z')),
		idService: FakeIdService()
	};
}

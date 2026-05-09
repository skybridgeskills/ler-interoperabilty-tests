import type { AppContext } from './app-context.js';
import { RealIdService } from './services/id-service/id-service.js';
import { PinoLoggerService } from './services/logging/logger-service.js';
import { RealTimeService } from './services/time-service/time-service.js';

/** Builds the dev AppContext: pretty pino logger, real wall clock, real IDs. */
export function DevAppContext(env: Record<string, unknown>): AppContext {
	return {
		logger: PinoLoggerService({
			level: typeof env.LOG_LEVEL === 'string' ? env.LOG_LEVEL : 'info',
			pretty: true
		}),
		timeService: RealTimeService(),
		idService: RealIdService()
	};
}

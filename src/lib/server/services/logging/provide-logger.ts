import { providerCtx } from '$lib/server/util/provider/provider-ctx.js';

import {
	PinoLoggerService,
	SilentLoggerService,
	type LoggerService,
	type PinoLoggerOptions
} from './logger-service.js';

/**
 * Provider factory for the real (pino-backed) logger. Pass `{ pretty: true }`
 * in dev for a human-readable stream; leave off in CI/prod for structured JSON.
 */
export function PinoLoggingProvider(opts: PinoLoggerOptions) {
	return () => ({ logger: PinoLoggerService(opts) });
}

/**
 * Provider that wires a silent logger. Used by the test app context so unit
 * tests don't pollute stdout.
 */
export function provideSilentLogger() {
	return { logger: SilentLoggerService() };
}

export type LoggerCtx = { logger: LoggerService };

/**
 * Thin accessor. Use inside any code that runs under `runInContext`.
 */
export function logger(): LoggerService {
	return providerCtx<LoggerCtx>().logger;
}

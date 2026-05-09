import pino, { type Logger as PinoLogger } from 'pino';

/**
 * Minimal structured logger interface used throughout the app.
 *
 * Implementations wrap a `pino` logger so the surface stays narrow and easy to
 * fake in tests.
 */
export interface LoggerService {
	info: (obj: object, msg?: string) => void;
	warn: (obj: object, msg?: string) => void;
	error: (obj: object, msg?: string) => void;
	debug: (obj: object, msg?: string) => void;
	child: (bindings: object) => LoggerService;
}

export interface PinoLoggerOptions {
	level?: string;
	pretty?: boolean;
}

/**
 * Real logger backed by pino. Use `pretty: true` in dev for a readable console
 * stream; leave it off in CI / prod for structured JSON output.
 */
export function PinoLoggerService(opts: PinoLoggerOptions = {}): LoggerService {
	const base: PinoLogger = pino({
		level: opts.level ?? 'info',
		transport: opts.pretty ? { target: 'pino-pretty' } : undefined
	});
	return wrap(base);
}

/**
 * Silent logger for tests. Drops all output by setting pino's level to silent.
 */
export function SilentLoggerService(): LoggerService {
	return wrap(pino({ level: 'silent' }));
}

function wrap(logger: PinoLogger): LoggerService {
	return {
		info: (obj, msg) => logger.info(obj, msg),
		warn: (obj, msg) => logger.warn(obj, msg),
		error: (obj, msg) => logger.error(obj, msg),
		debug: (obj, msg) => logger.debug(obj, msg),
		child: (bindings) => wrap(logger.child(bindings))
	};
}

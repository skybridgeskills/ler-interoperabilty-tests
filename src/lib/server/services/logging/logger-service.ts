import pino, { type Logger as PinoLogger } from 'pino';
import pretty from 'pino-pretty';

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
 *
 * When `pretty: true`, `pino-pretty` is wired directly as a synchronous
 * Writable stream rather than via pino's `transport` option. The transport
 * mechanism uses worker_threads with runtime module resolution, which the
 * SvelteKit/Vite server bundler cannot trace at boot — streaming sidesteps
 * the worker entirely and works in both bundled and unbundled environments.
 */
export function PinoLoggerService(opts: PinoLoggerOptions = {}): LoggerService {
	const level = opts.level ?? 'info';
	const base: PinoLogger = opts.pretty
		? pino({ level }, pretty({ colorize: true, translateTime: 'SYS:HH:MM:ss.l' }))
		: pino({ level });
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

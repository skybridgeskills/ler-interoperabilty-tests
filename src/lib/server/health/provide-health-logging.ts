import type { LoggerService } from '../services/logging/logger-service.js';

import { logHealthSnapshot } from './health-snapshot-log.js';
import type { HealthRegistryCtx } from './provide-health-registry.js';

const DEFAULT_HEALTH_SNAPSHOT_INTERVAL_MS = 60_000;

type TimerHandle = ReturnType<typeof setTimeout>;

export interface HealthLoggingProviderOpts {
	env?: NodeJS.ProcessEnv;
	initialDelayMs?: number;
	intervalMs?: number;
	random?: () => number;
}

export type HealthLoggingCtx = {
	[Symbol.dispose]: () => void;
};

export type HealthLoggingProviderCtx = HealthRegistryCtx & { logger: LoggerService };

export function provideHealthLogging(
	ctx: HealthLoggingProviderCtx,
	opts: HealthLoggingProviderOpts = {}
): HealthLoggingCtx {
	const config = resolveHealthLoggingConfig(opts);

	if (!config.enabled) {
		return { [Symbol.dispose]: () => undefined };
	}

	let disposed = false;
	let timer: TimerHandle | undefined;

	const schedule = (delayMs: number) => {
		timer = setTimeout(() => void emitAndScheduleNext(), delayMs);
	};

	const emitAndScheduleNext = async () => {
		if (disposed) return;

		await emitSnapshot(ctx, config.intervalMs, config.env);

		if (!disposed) {
			schedule(config.intervalMs);
		}
	};

	schedule(config.initialDelayMs);

	return {
		[Symbol.dispose]: () => {
			disposed = true;
			if (timer) clearTimeout(timer);
		}
	};
}

async function emitSnapshot(
	ctx: HealthLoggingProviderCtx,
	intervalMs: number,
	env: NodeJS.ProcessEnv
): Promise<void> {
	try {
		const run = await ctx.healthRegistry.runAll();
		logHealthSnapshot(ctx.logger, { env, run, intervalMs });
	} catch (err) {
		ctx.logger.warn({ err }, 'health-snapshot failed');
	}
}

function resolveHealthLoggingConfig(opts: HealthLoggingProviderOpts) {
	const env = opts.env ?? process.env;
	const explicitEnabled = env.HEALTH_SNAPSHOT_ENABLED?.trim().toLowerCase();
	const intervalMs =
		opts.intervalMs ??
		parseInteger(env.HEALTH_SNAPSHOT_INTERVAL_MS) ??
		DEFAULT_HEALTH_SNAPSHOT_INTERVAL_MS;
	const enabled = explicitEnabled !== 'false' && intervalMs > 0;
	const random = opts.random ?? Math.random;
	const initialDelayMs = opts.initialDelayMs ?? Math.floor(random() * intervalMs);

	return {
		enabled,
		env,
		intervalMs,
		initialDelayMs
	};
}

function parseInteger(value: string | undefined): number | undefined {
	if (value == null || value.trim() === '') return undefined;

	const parsed = Number.parseInt(value, 10);
	if (!Number.isFinite(parsed)) return undefined;

	return parsed;
}

# Phase 02 — Provider DI + app context + service skeleton

## Scope of phase

Stand up the dependency-injection plumbing and the day-one services:
`LoggerService`, `TimeService`, `IdService`. Wire dev and test app
contexts. Add `hooks.server.ts` to put each request inside the AppContext.
Add `/health` and `/version` endpoints exercising the time + version
helpers. Add provider-system "README as test" examples.

Files created in this phase:

- `src/lib/server/util/provider/{providers.ts, provider-ctx.ts, README.test.ts}`
  (copy verbatim from skills-verifier).
- `src/lib/server/util/{panic.ts, panic.test.ts, zod-factory.ts, app-version.ts}`
  (copied / adapted from skills-verifier).
- `src/lib/server/services/logging/{logger-service.ts, logger-service.test.ts, provide-logger.ts}`.
- `src/lib/server/services/time-service/{time-service.ts, time-service.test.ts, provide-time-service.ts}`.
- `src/lib/server/services/id-service/{id-service.ts, id-service.test.ts, provide-id-service.ts}`.
- `src/lib/server/{app-context.ts, app-env.ts, build-app-context.ts,
dev-app-context.ts, test-app-context.ts}`.
- `src/hooks.server.ts` (per-request `runInContext`).
- `src/routes/health/+server.ts`, `src/routes/version/+server.ts`.
- `src/lib/index.ts` (lib barrel; minimal for now).

## Code Organization Reminders

- Prefer a granular file structure, one concept per file.
- Place more abstract things, entry points, and tests **first**.
- Place helper utility functions **at the bottom** of files.
- Keep related functionality grouped together (each service in its own
  folder with co-located test + provider).
- Any temporary code should have a TODO comment so we can find it later.

## Style conventions

- **Factory functions, not classes.** Each service is `function
RealXxxService(...)` returning a plain object; types via
  `ReturnType<typeof RealXxxService>`. Test variants are `FakeXxxService`.
- **Providers.** Use `provideThing` for no-config providers
  (`provideTimeService`). Use `ThingProvider(config)` PascalCase factory
  when config is needed (`PinoLoggingProvider({ level, pretty })`).
- **Context types `XxxCtx`.** Every provider exports
  `export type XxxCtx = OutputOfProvider<typeof provideXxx>`.
- **Accessor functions.** Where access from many call sites is expected,
  add a thin `xxxService()` accessor wrapping `providerCtx<XxxCtx>()`.
- **`ZodFactory` for shared schemas** — none in this phase, but the
  helper lands so later phases can use it.
- **No singletons in injectable code.** Don't `import` a service from a
  module-scope singleton; always go through the provider chain.
- Files ≤ ~200 lines. Order high-level first, helpers + types at bottom.
- TSDoc on each public service factory and provider, explaining what the
  service is for and what the provider contributes to the chain.

## Implementation Details

### Provider system

Copy verbatim from skills-verifier:

- `src/lib/server/util/provider/providers.ts`
- `src/lib/server/util/provider/provider-ctx.ts`
- `src/lib/server/util/provider/README.test.ts`

Adjust import paths only as needed to match this repo (`$lib/...`).

### `panic.ts` and `zod-factory.ts`

Copy verbatim from skills-verifier (`src/lib/server/util/panic.ts`,
`panic.test.ts`, `zod-factory.ts`). These are used by the provider system
and by future schemas.

### `app-version.ts`

Read app version from `package.json` + git short SHA at build/runtime.
Skills-verifier has a parallel implementation; adapt it.

```ts
// src/lib/server/util/app-version.ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';

import { ZodFactory } from './zod-factory.js';

export const VersionBody = ZodFactory(
	z.object({
		name: z.string(),
		version: z.string(),
		commit: z.string().optional(),
		builtAt: z.string().datetime().optional()
	})
);
export type VersionBody = ReturnType<typeof VersionBody>;

export function appVersion(): VersionBody {
	// Read from $lib root or APP_VERSION env. Keep small; pull from
	// generated file at build time later if needed.
	const pkg = JSON.parse(
		readFileSync(fileURLToPath(new URL('../../../../package.json', import.meta.url)), 'utf8')
	);
	return VersionBody({
		name: pkg.name,
		version: pkg.version,
		commit: process.env.GIT_COMMIT || undefined,
		builtAt: process.env.BUILT_AT || undefined
	});
}
```

### `LoggerService`

```ts
// src/lib/server/services/logging/logger-service.ts
import pino, { type Logger as PinoLogger } from 'pino';

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

export function PinoLoggerService(opts: PinoLoggerOptions = {}): LoggerService {
	const base: PinoLogger = pino({
		level: opts.level ?? 'info',
		transport: opts.pretty ? { target: 'pino-pretty' } : undefined
	});
	return wrap(base);
}

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
```

```ts
// src/lib/server/services/logging/provide-logger.ts
import { providerCtx } from '$lib/server/util/provider/provider-ctx.js';
import type { OutputOfProvider } from '$lib/server/util/provider/providers.js';

import {
	PinoLoggerService,
	SilentLoggerService,
	type LoggerService,
	type PinoLoggerOptions
} from './logger-service.js';

export function PinoLoggingProvider(opts: PinoLoggerOptions) {
	return () => ({ logger: PinoLoggerService(opts) });
}

export function provideSilentLogger() {
	return { logger: SilentLoggerService() };
}

export type LoggerCtx = { logger: LoggerService };

export function logger(): LoggerService {
	return providerCtx<LoggerCtx>().logger;
}
```

Test: `logger-service.test.ts` — verify `SilentLoggerService` produces no
output; verify `child` returns a logger that includes the bindings.

### `TimeService`

```ts
// src/lib/server/services/time-service/time-service.ts
export interface TimeService {
	now: () => Date;
	nowMs: () => number;
}

export function RealTimeService(): TimeService {
	return {
		now: () => new Date(),
		nowMs: () => Date.now()
	};
}

export function FakeTimeService(initial: Date | number = 0): TimeService {
	let ms = typeof initial === 'number' ? initial : initial.getTime();
	return {
		now: () => new Date(ms),
		nowMs: () => ms,
		// test-only mutator on the returned object — typed via the cast below
		advance: (deltaMs: number) => {
			ms += deltaMs;
		},
		set: (next: Date | number) => {
			ms = typeof next === 'number' ? next : next.getTime();
		}
	} as TimeService & { advance: (n: number) => void; set: (n: Date | number) => void };
}
```

Provider:

```ts
// src/lib/server/services/time-service/provide-time-service.ts
import { providerCtx } from '$lib/server/util/provider/provider-ctx.js';
import { RealTimeService, FakeTimeService, type TimeService } from './time-service.js';

export function provideTimeService() {
	return { timeService: RealTimeService() };
}

export function FakeTimeServiceProvider(initial?: Date | number) {
	return () => ({ timeService: FakeTimeService(initial ?? 0) });
}

export type TimeServiceCtx = { timeService: TimeService };

export function timeService(): TimeService {
	return providerCtx<TimeServiceCtx>().timeService;
}
```

Test: `time-service.test.ts` — `RealTimeService` returns roughly-now;
`FakeTimeService` is deterministic and `advance(1000)` moves it 1s.

### `IdService`

```ts
// src/lib/server/services/id-service/id-service.ts
export interface IdService {
	uuid: () => string;
	short: (prefix: string) => string;
}

export function RealIdService(): IdService {
	return {
		uuid: () => crypto.randomUUID(),
		short: (prefix) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`
	};
}

export function FakeIdService(): IdService {
	let counter = 0;
	return {
		uuid: () => `00000000-0000-0000-0000-${String(++counter).padStart(12, '0')}`,
		short: (prefix) => `${prefix}-${String(++counter).padStart(8, '0')}`
	};
}
```

Provider mirrors `provideTimeService` / `FakeTimeServiceProvider`. Tests
verify `RealIdService` returns valid UUIDs and `FakeIdService` is
deterministic and monotonic.

### `app-env.ts`

```ts
// src/lib/server/app-env.ts
import { z } from 'zod';

const BaseEnv = z.object({
	CONTEXT: z.enum(['dev', 'test']).default('dev'),
	LOG_LEVEL: z.string().optional()
});
export type BaseEnv = z.infer<typeof BaseEnv>;

export function parseBaseEnv(env: Record<string, unknown>): BaseEnv {
	return BaseEnv.parse(env);
}
```

Test (`app-env.test.ts`): defaults to `dev`; rejects unknown context.

### `app-context.ts`

```ts
// src/lib/server/app-context.ts
import type { LoggerService } from './services/logging/logger-service.js';
import type { TimeService } from './services/time-service/time-service.js';
import type { IdService } from './services/id-service/id-service.js';
import { panic } from './util/panic.js';
import { providerCtx, contextStore } from './util/provider/provider-ctx.js';

export interface AppContext {
	logger: LoggerService;
	timeService: TimeService;
	idService: IdService;
}

export function appContext(): AppContext {
	if (!contextStore.getStore()) {
		panic('No app context present. Ensure runInContext() is called before accessing appContext().');
	}
	return providerCtx<AppContext>();
}
```

### `build-app-context.ts`, `dev-app-context.ts`, `test-app-context.ts`

```ts
// src/lib/server/build-app-context.ts
import type { AppContext } from './app-context.js';
import { parseBaseEnv } from './app-env.js';

export async function buildAppContext(env: Record<string, unknown>): Promise<AppContext> {
	const { CONTEXT } = parseBaseEnv(env);
	switch (CONTEXT) {
		case 'dev': {
			const { DevAppContext } = await import('./dev-app-context.js');
			return DevAppContext(env);
		}
		case 'test': {
			const { TestAppContext } = await import('./test-app-context.js');
			return TestAppContext(env);
		}
		default: {
			const _never: never = CONTEXT;
			throw new Error(`Unknown CONTEXT: ${_never}`);
		}
	}
}
```

```ts
// src/lib/server/dev-app-context.ts
import type { AppContext } from './app-context.js';
import { PinoLoggerService } from './services/logging/logger-service.js';
import { RealTimeService } from './services/time-service/time-service.js';
import { RealIdService } from './services/id-service/id-service.js';

export function DevAppContext(env: Record<string, unknown>): AppContext {
	return {
		logger: PinoLoggerService({ level: String(env.LOG_LEVEL ?? 'info'), pretty: true }),
		timeService: RealTimeService(),
		idService: RealIdService()
	};
}
```

```ts
// src/lib/server/test-app-context.ts
import type { AppContext } from './app-context.js';
import { SilentLoggerService } from './services/logging/logger-service.js';
import { FakeTimeService } from './services/time-service/time-service.js';
import { FakeIdService } from './services/id-service/id-service.js';

export function TestAppContext(_env: Record<string, unknown>): AppContext {
	return {
		logger: SilentLoggerService(),
		timeService: FakeTimeService(new Date('2026-05-09T00:00:00Z')),
		idService: FakeIdService()
	};
}
```

Tests: `app-context.test.ts` (unit — DevAppContext returns the right
service shapes; TestAppContext is deterministic) and an
`app-context.integration.test.ts` that wraps a fake handler in
`runInContext` and reads back through the accessors.

### `hooks.server.ts`

```ts
// src/hooks.server.ts
import { env } from '$env/dynamic/private';

import { buildAppContext } from '$lib/server/build-app-context.js';
import { runInContext } from '$lib/server/util/provider/provider-ctx.js';

const ctxPromise = buildAppContext(env);

export async function handle({ event, resolve }) {
	const ctx = await ctxPromise;
	event.locals.requestId = ctx.idService.short('req');
	return runInContext(ctx, () => resolve(event));
}
```

### `/health` and `/version`

```ts
// src/routes/health/+server.ts
import { json } from '@sveltejs/kit';

import { appContext } from '$lib/server/app-context.js';
import { appVersion } from '$lib/server/util/app-version.js';

export function GET() {
	appContext(); // ensure context is wired; throws helpfully if not
	return json({ status: 'ok', version: appVersion() });
}
```

```ts
// src/routes/version/+server.ts
import { json } from '@sveltejs/kit';

import { appVersion } from '$lib/server/util/app-version.js';

export function GET() {
	return json(appVersion());
}
```

## Validate

```sh
pnpm turbo check    # prettier + eslint + svelte-check
pnpm turbo test     # NOTE: still won't run if Phase 04 hasn't landed yet.
                    #       For Phase 02, run vitest directly to spot-check
                    #       the unit tests written here:
CONTEXT=test pnpm exec vitest run src/lib/server
```

If `pnpm turbo test` fails because Vitest projects aren't configured,
that's expected — Phase 04 wires the project file. The direct
`vitest run src/lib/server` smoke check is enough for this phase.

Manual check:

```sh
pnpm dev
curl -s http://localhost:5173/health
curl -s http://localhost:5173/version
```

Both should return JSON with the package name + version.

Clean up any warnings before moving on.

DO NOT COMMIT between phases unless specifically requested.

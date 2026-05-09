import { describe, expect, it, test, vi } from 'vitest';

import { providerCtx, providerCtxSafe } from './provider-ctx.js';
import type { OutputOfProvider } from './providers.js';
import { Providers, runWithProvider, Wrapper } from './providers.js';

//
// This file demonstrates the provider system colocated under src/lib/server/util/provider.
// It has no SvelteKit or route dependencies — only provider-ctx + providers.
//

// =================================================================================================
// Overview
// =================================================================================================

//
// The provider system builds application context objects from composable functions.
//
// The core question it answers: what's the simplest way to assemble a context (DB, services,
// config, auth, etc.) that can be shared across app startup, request handling, tests, and stories?
//
// The answer: providers are just functions that return objects. Chain them with Providers(),
// store the result in AsyncLocalStorage, and read it back with providerCtx<T>().
//
// This is conceptually similar to React's Context/Provider model but for server-side code,
// using AsyncLocalStorage instead of a component tree.
//
// Why build it custom?
//   - It's ~300 lines of core logic, trivial to maintain
//   - The same providers used in production also power test fixtures — no test/prod divergence
//   - Lightweight DI without frameworks, decorators, or registration steps
//

// Here's the whole thing at a glance — plain providers, a dependency, a factory,
// a wrapper, and disposal, all composed in one chain:

test('overview: everything in one chain', async () => {
	const log: string[] = [];

	// 1. A plain provider — returns context keys
	function provideAppInfo() {
		return {
			appInfo: { name: 'TestApp', version: '1.0.0' }
		};
	}

	// 2. A provider with a dependency — receives accumulated context
	function provideUserService({ appInfo }: { appInfo: { name: string } }) {
		return {
			userService: {
				findUser: (id: string) => ({ id, source: appInfo.name })
			}
		};
	}

	// 3. A factory — returns a provider configured with static args
	function LoggingProvider(level: string) {
		return () => ({
			logger: {
				log: (msg: string) => log.push(`[${level}] ${msg}`)
			}
		});
	}

	// 4. A wrapper — controls execution lifecycle (setup/teardown)
	const TimingWrapper = Wrapper<void, void>(async (fn) => {
		log.push('timing:start');
		try {
			await fn();
		} finally {
			log.push('timing:end');
		}
	});

	// 5. A provider with disposal — cleans up when the scope ends
	function provideConnection() {
		log.push('connection:open');
		return {
			connection: { open: true },
			[Symbol.dispose]: () => log.push('connection:closed')
		};
	}

	// Chain them: each provider sees everything before it, wrappers nest around the rest
	const provideAll = Providers(
		provideAppInfo,
		provideUserService,
		LoggingProvider('debug'),
		TimingWrapper,
		provideConnection
	);

	await runWithProvider(
		provideAll,
		(ctx) => {
			// All keys are available on ctx
			const user = ctx.userService.findUser('u-42');
			ctx.logger.log(`found ${user.id} from ${user.source}`);
			expect(user).toEqual({ id: 'u-42', source: 'TestApp' });
			expect(ctx.appInfo.version).toBe('1.0.0');
			expect(ctx.connection.open).toBe(true);
		},
		undefined
	);

	// Wrapper ran around everything; disposal ran after
	expect(log).toEqual([
		'timing:start',
		'connection:open',
		'[debug] found u-42 from TestApp',
		'connection:closed',
		'timing:end'
	]);
});

// The rest of this file breaks down each piece individually.

// =================================================================================================
// Provider functions
// =================================================================================================

//
// A provider is a function that returns an object with one (or more) keys.
//
// By convention:
//   - Simple providers are named provide<Something>
//   - They return an object with a camelCase key matching what they provide
//   - Async providers (e.g. connecting to a DB) return promises — the chain awaits them
//

function provideConfig() {
	return {
		config: {
			idPrefix: 'test-',
			appTitle: 'Provider demo',
			captainName: 'Picard'
		}
	};
}

// A context type alias makes it easy to declare dependencies on what a provider gives you.

type ConfigCtx = OutputOfProvider<typeof provideConfig>;

// =================================================================================================
// Dependencies between providers
// =================================================================================================

//
// Providers can depend on earlier providers in the chain, simply by accepting the
// accumulated context as a parameter.
//
// The type system enforces this: if provideData needs ConfigCtx, it must appear
// after provideConfig in the Providers() chain, or TypeScript will error.
//

function provideData({ config }: ConfigCtx) {
	return {
		data: {
			users: {
				captain: {
					id: config.idPrefix + 'captain',
					name: config.captainName
				}
			}
		}
	};
}
type DataCtx = OutputOfProvider<typeof provideData>;

// =================================================================================================
// Provider chains
// =================================================================================================

//
// Providers() chains multiple providers into a single composed provider.
// Each provider receives the accumulated context from all prior providers.
// The result is merged into one flat context object.
//
// In production, hooks or app startup might use this to wire the full context:
//
//   Providers(
//     () => bootstrapCtx,
//     ConsoleLoggingProvider({ pretty: true }),
//     provideMemoryDatabase,
//     provideAppServicesForDev,
//   )()
//
// Chains are also providers themselves, so they nest freely:
//
//   const base = Providers(provideConfig, provideData);
//   const extended = Providers(base, provideMoreStuff);
//

const provideTestCtx = Providers(provideConfig, provideData);

// =================================================================================================
// Using providers in tests
// =================================================================================================

describe('provider context', () => {
	//
	// Use runWithProvider() so the test body runs inside the provider's ALS scope.
	//

	it('should be passed to the test function', async () => {
		await runWithProvider(
			provideTestCtx,
			async (ctx) => {
				expect(ctx.data.users.captain.name).toBe(ctx.config.captainName);
			},
			undefined
		);
	});

	//
	// providerCtx<T>() reads from the current AsyncLocalStorage scope.
	// This is how production code accesses services — no need to thread ctx through
	// every function call.
	//
	it('should be accessible from providerCtx()', async () => {
		await runWithProvider(
			provideTestCtx,
			async (ctx) => {
				expect(providerCtx<DataCtx>().data.users.captain.name).toBe(ctx.config.captainName);
			},
			undefined
		);
	});

	//
	// providerCtxSafe<T>() is the same but returns undefined for missing keys
	// instead of panicking. Useful when a value is optional (e.g. authorization
	// may not be present outside a request scope).
	//
	it('should be accessible from providerCtxSafe()', async () => {
		await runWithProvider(
			provideTestCtx,
			async (ctx) => {
				expect(providerCtxSafe<DataCtx>().data?.users.captain.name).toBe(ctx.config.captainName);
			},
			undefined
		);
	});
});

// =================================================================================================
// Provider factories
// =================================================================================================

//
// When a provider needs static configuration, wrap it in a factory function.
//
// By convention, factories are named <Something>Provider (PascalCase) to distinguish
// them from plain provide<Something> functions.
//

function ConfigOverrideProvider(override: Partial<ConfigCtx['config']>) {
	return () => ({
		config: {
			...providerCtxSafe<ConfigCtx>().config,
			...override
		}
	});
}

test('override provider', async () => {
	await runWithProvider(
		Providers(provideTestCtx, ConfigOverrideProvider({ captainName: 'Kirk' })),
		async (ctx) => {
			expect(ctx.config.captainName).toBe('Kirk');
		},
		undefined
	);
});

// =================================================================================================
// Disposal
// =================================================================================================

//
// Providers can return Symbol.dispose or Symbol.asyncDispose alongside their context keys.
// When the provider scope ends (test completes, request finishes), disposal runs automatically.
//
// This is how resources clean up without manual teardown:
//   - Database connections
//   - Mocked globals (e.g. FetchMockProvider restores globalThis.fetch on dispose)
//   - Temporary files or state
//

function provideConnection() {
	const connection = { open: true, queries: [] as string[] };

	return {
		connection,
		[Symbol.dispose]: () => {
			connection.open = false;
		}
	};
}

test('disposal cleans up resources', async () => {
	let connection: { open: boolean } | undefined;

	await runWithProvider(
		provideConnection,
		(ctx) => {
			connection = ctx.connection;
			expect(ctx.connection.open).toBe(true);
		},
		undefined
	);

	expect(connection!.open).toBe(false);
});

//
// Async disposal works the same way, for resources that need async cleanup.
//

function provideAsyncResource() {
	const resource = { state: 'active' };

	return {
		resource,
		[Symbol.asyncDispose]: async () => {
			resource.state = 'disposed';
		}
	};
}

test('async disposal', async () => {
	let resource: { state: string } | undefined;

	await runWithProvider(
		provideAsyncResource,
		(ctx) => {
			resource = ctx.resource;
			expect(resource.state).toBe('active');
		},
		undefined
	);

	expect(resource!.state).toBe('disposed');
});

// =================================================================================================
// Wrappers
// =================================================================================================

//
// A Wrapper is a special kind of provider that controls the execution scope.
// Instead of running once and merging context, it wraps all subsequent code
// in a try/finally or similar lifecycle.
//
// Use a Wrapper when you need setup/teardown around execution:
//   - Fake timers (install before, restore after)
//   - Transactions (begin before, rollback after)
//   - Mocked globals that need restoration
//
// The wrapper receives a `fn` callback — calling it runs the rest of the chain.
// Anything you do before/after fn() acts as setup/teardown.
//

function TimeReportingWrapper(reportFn: (durationMs: number) => void) {
	return Wrapper<void, void>(async (fn) => {
		const startTime = Date.now();
		try {
			await fn();
		} finally {
			const endTime = Date.now();
			reportFn(endTime - startTime);
		}
	});
}

test('wrappers provide setup/teardown around execution', async () => {
	let durationMs: number | undefined;

	const wrapper = TimeReportingWrapper((duration) => {
		durationMs = duration;
	});

	const provideFakeClock = Wrapper<void, { tickAsync: (ms: number) => Promise<void> }>(
		async (fn) => {
			vi.useFakeTimers({ now: 0 });
			try {
				await fn({
					tickAsync: async (ms) => {
						await vi.advanceTimersByTimeAsync(ms);
					}
				});
			} finally {
				vi.useRealTimers();
			}
		}
	);

	const chain = Providers(provideFakeClock, wrapper);

	await runWithProvider(
		chain,
		async (ctx) => {
			await ctx.tickAsync(100);
		},
		undefined
	);

	expect(durationMs).toBe(100);
});

// =================================================================================================
// Putting it together: real-world test patterns
// =================================================================================================

//
// In practice, tests compose pre-built providers for the app, test data, and auth.
// Each piece is reusable — mix and match for different test scenarios.
//

// -------------------------------------------------------------------------------------------------

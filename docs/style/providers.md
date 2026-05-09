# Provider System

The provider system is our dependency injection mechanism, built on AsyncLocalStorage. It enables shared context (DB, services, config, etc.) across tests, stories, and production code without manual threading.

## Core Concepts

1. **Providers** — Functions that return context objects
2. **Provider chains** — Composed with `Providers()` to build layered context
3. **Context access** — Read via `providerCtx<T>()` or `providerCtxSafe<T>()`
4. **Wrappers** — Special providers for setup/teardown (timers, transactions)

## Quick Example

```ts
import { Providers, runWithProvider } from '$lib/server/util/provider/providers.js';
import { providerCtx } from '$lib/server/util/provider/provider-ctx.js';

// 1. Define providers
function provideConfig() {
	return { config: { apiUrl: 'https://api.example.com' } };
}

function provideApiClient({ config }: { config: { apiUrl: string } }) {
	return { apiClient: createApiClient(config.apiUrl) };
}

// 2. Chain them
const provideAll = Providers(provideConfig, provideApiClient);

// 3. Run with context
await runWithProvider(
	provideAll,
	async (ctx) => {
		// ctx has both config and apiClient
		const result = await ctx.apiClient.fetch('/users');

		// Or access from anywhere in the call stack
		const sameClient = providerCtx<{ apiClient: ApiClient }>().apiClient;
	},
	undefined
);
```

## Provider Conventions

### Simple Providers (`provideThing`)

For providers that don't need configuration, use the `provide` prefix.

```ts
export function provideDatabase() {
	return { database: createDatabase() };
}

export function provideConfig() {
	return { config: loadConfig() };
}
```

### Provider Factories (`ThingProvider`)

For providers that need static configuration, use PascalCase + `Provider` suffix.

```ts
export function LoggingProvider(options: { level: string; pretty: boolean }) {
	return () => ({
		logger: createLogger(options)
	});
}

// Usage
const provideAll = Providers(
	provideConfig,
	LoggingProvider({ level: 'debug', pretty: true }),
	provideDatabase
);
```

### Provider with Dependencies

Providers can depend on earlier providers in the chain by accepting the accumulated context.

```ts
export type ConfigCtx = OutputOfProvider<typeof provideConfig>;

export function provideUserService({ config }: ConfigCtx) {
	return { userService: UserService(config.databaseUrl) };
}

export type UserServiceCtx = OutputOfProvider<typeof provideUserService>;
```

## Context Type Pattern

Every provider exports a context type derived from its return type.

```ts
// my-service.ts
export function provideMyService() {
	return { myService: MyService() };
}

// Export the context type for composition
export type MyServiceCtx = OutputOfProvider<typeof provideMyService>;

// Accessor function for convenience
export function myService() {
	return providerCtx<MyServiceCtx>().myService;
}
```

## Disposal

Providers can return disposal symbols for automatic cleanup.

```ts
export function provideConnection() {
	const connection = createConnection();

	return {
		connection,
		[Symbol.dispose]: () => connection.close()
	};
}

// Automatically closed when the scope ends
await runWithProvider(
	provideConnection,
	(ctx) => {
		/* use connection */
	},
	undefined
);
// connection.close() called here
```

For async cleanup, use `Symbol.asyncDispose`.

## Wrappers

Wrappers control execution lifecycle. They're used for setup/teardown that wraps everything after them in the chain.

```ts
import { Wrapper } from '$lib/server/util/provider/providers.js';

const TransactionWrapper = Wrapper<void, void>(async (fn) => {
	const tx = await db.beginTransaction();
	try {
		await fn();
		await tx.commit();
	} catch (e) {
		await tx.rollback();
		throw e;
	}
});

// Usage — everything after the wrapper runs inside the transaction
const provideTest = Providers(provideDatabase, TransactionWrapper, provideFixtures);
```

## Testing with Providers

Tests use the `Providers()` chain directly, often with pre-built test providers.

```ts
import { test } from 'vitest';
import { Providers, runWithProvider } from '$lib/server/util/provider/providers.js';

test('user creation sends welcome email', async () => {
	await runWithProvider(
		Providers(provideTestApp, provideTestUser),
		async ({ userService, emailService }) => {
			await userService.create({ email: 'test@example.com' });
			expect(emailService.getSentEmails()).toHaveLength(1);
		},
		undefined
	);
});
```

## Scoped fetch mocking

In the SkyBridge monorepo, `FetchMockProvider` scopes mock `fetch` for tests and stories. If this repository adds a similar helper, prefer it over patching `globalThis.fetch` globally.

## Common Mistakes

**Don't** access provider context outside a provider scope:

```ts
// Wrong — providerCtx() throws if not in scope
const db = providerCtx<DatabaseCtx>().database; // ❌

// Right — access inside runWithProvider or a test
await runWithProvider(provideDatabase, (ctx) => {
	const db = ctx.database; // ✅
});
```

**Don't** create providers that do work in the factory (not the returned function):

```ts
// Wrong — connection opened at definition time, not use time
export function provideConnection() {
	const conn = createConnection(); // ❌ happens immediately
	return () => ({ connection: conn });
}

// Right — connection created when provider runs
export function provideConnection() {
	return { connection: createConnection() }; // ✅
}
```

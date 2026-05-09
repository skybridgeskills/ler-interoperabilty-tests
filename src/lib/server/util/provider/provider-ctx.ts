/**
 * Provider Context Management
 *
 * This file provides context storage and access for the provider injection system.
 * It uses AsyncLocalStorage to propagate context through async boundaries.
 *
 * Released into the public domain under Blue Oak Model License 1.0.0
 * https://blueoakcouncil.org/license/1.0.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- Proxy and dynamic context access require any */

import type { AsyncLocalStorage } from 'async_hooks';

// =================================================================================================
// Inline: panic function

/**
 * Throws an error with the given message or error object.
 * Useful for asserting impossible conditions.
 */
function panic(msgOrErr: string | Error): never {
	throw msgOrErr instanceof Error ? msgOrErr : new Error(msgOrErr);
}

// =================================================================================================
// Inline: isPromiseLike function

/**
 * Type guard to check if a value is a PromiseLike.
 */

function isPromiseLike<T>(value: any): value is PromiseLike<T> {
	return !!(value && typeof value.then === 'function');
}

// =================================================================================================
// Inline: FakeAsyncLocalStore function

/**
 * Browser-compatible fake implementation of AsyncLocalStorage.
 * Uses module-level state to simulate async local storage in browser environments.
 */
function FakeAsyncLocalStore<T>(): Pick<AsyncLocalStorage<T>, 'getStore' | 'run' | 'exit'> {
	let currentStore: T | undefined = undefined;

	return {
		getStore: () => currentStore,
		run: <R>(newStore: T, callback: () => R): R => {
			const oldValue = currentStore;
			currentStore = newStore;

			try {
				const result = callback();

				if (isPromiseLike(result)) {
					return Promise.resolve(result).finally(() => {
						currentStore = oldValue;
					}) as R;
				} else {
					currentStore = oldValue;
					return result;
				}
			} catch (error) {
				currentStore = oldValue;
				throw error;
			}
		},

		exit<R, TArgs extends any[]>(callback: (...args: TArgs) => R, ...args: TArgs): R {
			const prevValue = currentStore;
			currentStore = undefined;
			try {
				const result = callback(...args);

				if (isPromiseLike(result)) {
					return Promise.resolve(result).finally(() => {
						currentStore = prevValue;
					}) as R;
				} else {
					currentStore = prevValue;
					return result;
				}
			} catch (error) {
				currentStore = prevValue;
				throw error;
			}
		}
	};
}

// =================================================================================================
// Inline: UniversalAsyncLocalStore function

/**
 * Creates an AsyncLocalStorage-compatible store for the current environment,
 * supporting both node and browser environments.
 *
 * On browser, a singleton shim is used.
 */
export async function UniversalAsyncLocalStore<T>(): Promise<{
	getStore(): T | undefined;

	exit<R, TArgs extends any[]>(callback: (...args: TArgs) => R, ...args: TArgs): R;
	run<R>(store: T, callback: () => R): R;

	run<R, TArgs extends any[]>(store: T, callback: (...args: TArgs) => R, ...args: TArgs): R;
}> {
	if (typeof window !== 'undefined') {
		// In browser, use fake
		return FakeAsyncLocalStore<T>();
	}

	// On node, use AsyncLocalStorage
	const { AsyncLocalStorage } = await import('async_hooks');
	return new AsyncLocalStorage();
}

// =================================================================================================
// Inline: Global singleton utilities

/**
 * Gets the global object that works in both Node.js and browser environments.
 */
function getGlobalObject(): typeof globalThis {
	return globalThis;
}

/**
 * Creates a global singleton that's shared across all module instances,
 * including bundled code (e.g., from SvelteKit adapter-node).
 *
 * This is necessary because Node.js treats modules loaded from different paths
 * (e.g., bundled vs source) as separate module instances, which can break
 * singleton patterns that rely on module-level state.
 *
 * @param key - A unique key for storing the singleton in the global object
 * @param factory - An async function that creates the singleton instance
 * @returns A promise that resolves to the singleton instance
 */
export async function createGlobalSingleton<T>(key: string, factory: () => Promise<T>): Promise<T> {
	const globalRef = getGlobalObject() as unknown as {
		[key: string]: T | Promise<T> | undefined;
	};

	const instanceKey = key;
	const promiseKey = `${key}Promise`;

	// If we already have an instance (not a Promise), return it
	const existing = globalRef[instanceKey];
	if (existing && !(existing instanceof Promise)) {
		return existing as T;
	}

	// If there's an initialization promise in progress, wait for it
	const existingPromise = globalRef[promiseKey];
	if (existingPromise instanceof Promise) {
		const instance = await existingPromise;
		globalRef[instanceKey] = instance;
		return instance;
	}

	// Create a new instance and store the promise to prevent race conditions
	const promise = factory();
	globalRef[promiseKey] = promise;

	try {
		const instance = await promise;
		globalRef[instanceKey] = instance;
		// Clear the promise once we have the instance
		delete globalRef[promiseKey];
		return instance;
	} catch (error) {
		// If initialization fails, clear the promise so it can be retried
		delete globalRef[promiseKey];
		throw error;
	}
}

/**
 * Gets a global singleton instance synchronously.
 * This should only be called after the singleton has been initialized.
 *
 * @param key - The unique key used to store the singleton
 * @returns The singleton instance
 * @throws Error if the singleton hasn't been initialized yet
 */
export function getGlobalSingleton<T>(key: string): T {
	const globalRef = getGlobalObject() as unknown as {
		[key: string]: T | undefined;
	};

	const instance = globalRef[key];
	if (!instance) {
		throw new Error(
			`Global singleton "${key}" not initialized. Ensure it's initialized before use.`
		);
	}

	return instance;
}

// =================================================================================================
// Provider Context Code

/**
 * Provides access to the current provider context.
 *
 * This function is the idiomatic way to access provided services after initialization.
 *
 * ```typescript
 *  providerCtx<MyServiceCtx>().myService
 * ```
 *
 * Will throw an error if the requested property is not present.
 *
 * This method should _not_ generally be called from provider functions themselves -- they should
 * declare their dependencies in their method signatures.
 */
export function providerCtx<T>() {
	return strictContextProxy as T;
}

/**
 * Provides access to the current provider context, allowing access to properties that may be undefined.
 *
 * This function is the idiomatic way to access provided services after initialization.
 *
 * ```typescript
 *  providerCtxSafe<MyServiceCtx>().myService
 * ```
 *
 * This method should _not_ generally be called from provider functions themselves -- they should
 * declare their dependencies in their method signatures.
 */
export function providerCtxSafe<T>() {
	return safeContextProxy as Partial<T>;
}

/**
 * **USE WITH CAUTION**
 *
 * Replaces the current context with the given one and runs a function in it.
 *
 * Most code should _not_ need to call this. It should be used only for:
 *
 * - Entry points (such as in request middleware or test harness)
 * - Internal provider code and tests
 */
export function runInContext<T>(context: object, fn: () => T): T {
	const store = getContextStoreSync();
	if (context === store.getStore()) {
		return fn();
	} else {
		return store.run({ ...context }, fn);
	}
}

/**
 * **USE WITH CAUTION**
 *
 * Extends the current context with additional properties and runs a function in it.
 *
 * Most code should _not_ need to call this. It should be used only for:
 *
 * - Entry points (such as in request middleware or test harness)
 * - Internal provider code and tests
 */
export function runWithExtraContext<T>(extra: object, fn: () => T): T {
	const store = getContextStoreSync();
	return store.run(
		{
			...(store.getStore() ?? {}),
			...extra
		},
		fn
	);
}

// =================================================================================================
// Global singleton for contextStore to ensure it's shared across all module instances
// (including bundled code from SvelteKit adapter-node)

const CONTEXT_STORE_KEY = '__contextStore';

/**
 * Gets the singleton contextStore instance from the global cache.
 * This ensures all modules (bundled and unbundled) use the same instance.
 */
function getContextStoreSync() {
	return getGlobalSingleton<Awaited<ReturnType<typeof UniversalAsyncLocalStore<unknown>>>>(
		CONTEXT_STORE_KEY
	);
}

/**
 * The main storage for the provider context.
 *
 * This is a singleton that's shared across all module instances, including bundled code.
 */
export const contextStore = await createGlobalSingleton(CONTEXT_STORE_KEY, () =>
	UniversalAsyncLocalStore<unknown>()
);

/**
 * **USE WITH CAUTION**
 *
 * Runs the given function outside the provider context.
 *
 * Only use in very specific situations where you are manually managing the application context.
 *
 * Not for general use.
 */
export function runOutsideProviderCtx<T>(fn: () => T): T {
	const store = getContextStoreSync();
	return store.exit(() => fn());
}

/**
 * The singleton context proxy that provides safe(ish) access to properties in the current
 * provider context.
 */
const strictContextProxy = new Proxy(
	{},
	{
		get(target, prop) {
			// prevent errors from built-in prop checks
			if (
				typeof prop !== 'string' ||
				prop.startsWith('$$') ||
				prop.startsWith('@@') ||
				['then', 'constructor', 'toJSON'].includes(prop as string)
			) {
				return undefined;
			}

			const store = getContextStoreSync();
			const context: any =
				store.getStore() ??
				panic(`No provider context present when accessing context key: ${String(prop)}`);

			return (
				(context[prop] as any) ??
				panic(
					`Missing context key: ${String(prop)}; available keys: ${Object.keys(context).join(', ')}`
				)
			);
		},
		set() {
			panic('Cannot set properties on provider context. Use invokeProvider() instead.');
		},
		ownKeys() {
			const store = getContextStoreSync();
			const context: any = store.getStore();
			if (!context) {
				return [];
			}
			return Object.keys(context);
		},
		getOwnPropertyDescriptor(target, prop) {
			const store = getContextStoreSync();
			const context: any = store.getStore();
			if (!context) {
				return undefined;
			}
			return Object.getOwnPropertyDescriptor(context, prop);
		},
		has(_target: unknown, p: string | symbol): boolean {
			const store = getContextStoreSync();
			const context: any = store.getStore();
			if (!context) {
				return false;
			}
			return p in context;
		}
	}
);

const safeContextProxy = new Proxy(
	{},
	{
		get(target, prop) {
			const store = getContextStoreSync();
			const context: any = store.getStore();

			return context?.[prop];
		},
		set() {
			panic('Cannot set properties on provider context. Use invokeProvider() instead.');
		},
		ownKeys() {
			const store = getContextStoreSync();
			return Object.keys(store.getStore() ?? {});
		},
		getOwnPropertyDescriptor(target, prop) {
			const store = getContextStoreSync();
			return Object.getOwnPropertyDescriptor(store.getStore() ?? {}, prop);
		},
		has(_target: unknown, p: string | symbol): boolean {
			const store = getContextStoreSync();
			const context: any = store.getStore();
			if (!context) {
				return false;
			}
			return p in context;
		}
	}
);

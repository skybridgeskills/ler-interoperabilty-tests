/**
 * Provider Injection System
 *
 * This file provides a dependency injection system using provider functions.
 * Providers can be chained together to build up a context of services.
 *
 * Released into the public domain under Blue Oak Model License 1.0.0
 * https://blueoakcouncil.org/license/1.0.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- Generic provider system requires any for dynamic types */

import { runInContext, runWithExtraContext } from './provider-ctx.js';

// =================================================================================================
// Inline: panic function

function panic(msgOrErr: string | Error): never {
	throw msgOrErr instanceof Error ? msgOrErr : new Error(msgOrErr);
}

// =================================================================================================
// Inline: MaybePromise type

type MaybePromise<T> = T | Promise<T>;

// =================================================================================================
// Inline: Wrapper type and isWrapper function

export type Wrapper<in TIn, out TOut> = {
	$type: 'Wrapper';
	wrapperFn: (fn: (ctx: TOut) => void, input: TIn) => MaybePromise<void>;
};

export function Wrapper<TIn, TOut>(
	wrapperFn: (fn: (ctx: TOut) => void, input: TIn) => MaybePromise<void>
): Wrapper<ToVoidOrEmpty<TIn>, TOut> {
	return {
		$type: 'Wrapper',
		wrapperFn: wrapperFn as any
	};
}

function isWrapper(provider: ProviderLike<any, any>): provider is Wrapper<any, any> {
	return (provider as any).$type === 'Wrapper';
}

// =================================================================================================
// Inline: extractDispose function

function extractDispose<T>(obj: T): {
	dispose: (() => void) | undefined;
	asyncDispose: (() => Promise<void>) | undefined;
	rest: Omit<T, typeof Symbol.dispose | typeof Symbol.asyncDispose>;
} {
	const { [Symbol.dispose]: dispose, [Symbol.asyncDispose]: asyncDispose, ...rest } = obj as any;
	return { dispose, asyncDispose, rest };
}

// =================================================================================================
// Inline: disposeOf function

async function disposeOf(provided: unknown) {
	if (provided == null || typeof provided !== 'object') {
		return;
	}

	if (Symbol.dispose in provided) {
		await (provided as { [Symbol.dispose]: () => void | Promise<void> })[Symbol.dispose]();
	}

	if (Symbol.asyncDispose in provided) {
		await (provided as { [Symbol.asyncDispose]: () => Promise<void> })[Symbol.asyncDispose]();
	}
}

// =================================================================================================
// Inline: runWithProvider function

async function runWithProvider<TProvider extends ProviderLike<any, any>, TResult>(
	provider: TProvider,
	fn: (context: OutputOfProvider<TProvider>) => MaybePromise<TResult>,
	input: InputOfProvider<TProvider>
): Promise<TResult> {
	if (isWrapper(provider)) {
		let result: TResult | undefined = undefined;
		let called = false;

		await provider.wrapperFn(async (provided) => {
			const context = { ...(input ?? {}), ...provided };
			await runWithExtraContext(context, async () => {
				called = true;
				result = await fn(context);
			});
		}, input);

		if (!called) {
			panic('Wrapper function was not called. This is a bug. wrapperFn: ' + provider.wrapperFn);
		}

		return result as TResult;
	} else {
		const provided = await (provider as ProviderFn<any, any>)(input);
		const context = { ...(input ?? {}), ...provided };
		return await runWithExtraContext(context, async () => {
			try {
				return await fn(context as OutputOfProvider<TProvider>);
			} finally {
				await disposeOf(provided);
			}
		});
	}
}

// =================================================================================================
// Inline: wrapWithProvider function

function wrapWithProvider<TProvider extends ProviderLike<any, any>, TResult>(
	provider: TProvider,
	fn: (context: OutputOfProvider<TProvider>) => MaybePromise<TResult>
) {
	return async (input: InputOfProvider<TProvider>) => runWithProvider(provider, fn, input);
}

// =================================================================================================
// Type definitions

/**
 * An empty provider context.
 */
export type EmptyCtx = Record<never, never>;
export type VoidOrEmpty = void | EmptyCtx;

export type ProviderFn<in TIn, out TOut> = (input: TIn) => MaybePromise<TOut>;

export type ProviderLike<TIn = any, TOut = any> = ProviderFn<TIn, TOut> | Wrapper<TIn, TOut>;

export type InputOfProvider<T extends ProviderLike> =
	T extends ProviderLike<infer TIn, infer _TOut> ? ToVoid<TIn> : void;

export type OutputOfProvider<T extends ProviderLike> =
	T extends ProviderLike<infer TIn, infer TOut> ? ToVoid<ToEmpty<TIn> & ToEmpty<TOut>> : void;

export type ProvidedValueError<TOut, THint extends string> = {
	__error: 'ProvidedValue expects a provider that returns a single-key object';
	__actualType: TOut;
	__hint: THint;
};

export type ProvidedValue<T extends ProviderLike> =
	T extends ProviderLike<infer _TIn, infer TOut>
		? TOut extends Record<infer TName, infer TValue>
			? [TName] extends [string]
				? keyof TOut extends TName
					? TName extends keyof TOut
						? TValue
						: ProvidedValueError<TOut, 'Expected single key: { key: value }'>
					: ProvidedValueError<
							TOut,
							'Provider returns object with multiple keys. Expected single key: { key: value }'
						>
				: ProvidedValueError<
						TOut,
						'Provider returns complex object structure. Expected: { key: value }'
					>
			: TOut extends Record<string, any>
				? keyof TOut extends never
					? ProvidedValueError<TOut, 'Provider returns an empty object. Expected: { key: value }'>
					: ProvidedValueError<TOut, 'Provider does not return an object. Expected: { key: value }'>
				: ProvidedValueError<TOut, 'Provider does not return an object. Expected: { key: value }'>
		: never;

export type HasWrappers<T extends readonly ProviderLike[]> = T extends readonly [
	infer First,
	...infer Rest
]
	? First extends Wrapper<any, any>
		? true
		: Rest extends readonly ProviderLike[]
			? HasWrappers<Rest>
			: false
	: false;

export type ToEmpty<T> = unknown extends T
	? EmptyCtx
	: void extends T
		? EmptyCtx
		: T extends object
			? T
			: EmptyCtx;

export type ToVoid<T> = EmptyCtx extends T ? void : unknown extends T ? void : T;

export type ToVoidOrEmpty<T> = void extends T
	? void | EmptyCtx
	: EmptyCtx extends T
		? void | EmptyCtx
		: unknown extends T
			? void | EmptyCtx
			: T;

export type _OutputOfChain<T extends readonly ProviderLike[]> = T extends readonly [
	infer First,
	...infer Rest
]
	? First extends ProviderLike<any, infer TOut>
		? Rest extends readonly ProviderLike[]
			? ToEmpty<TOut> & _OutputOfChain<Rest>
			: ToEmpty<TOut>
		: EmptyCtx
	: EmptyCtx;

export type OutputOfChain<T extends readonly ProviderLike[], TInput = EmptyCtx> = ToVoid<
	_OutputOfChain<T> & ToEmpty<TInput>
>;

type _InputOfChain<T extends readonly ProviderLike[], TChainOut = EmptyCtx> = T extends readonly [
	infer First,
	...infer Rest
]
	? First extends ProviderLike<infer TIn, infer TOut>
		? Rest extends readonly ProviderLike[]
			? Omit<ToEmpty<TIn>, keyof TChainOut> & _InputOfChain<Rest, TChainOut & TOut>
			: Omit<ToEmpty<TIn>, keyof TChainOut>
		: EmptyCtx
	: EmptyCtx;

export type InputOfChain<T extends readonly ProviderLike[], TChainOut = EmptyCtx> = ToVoid<
	_InputOfChain<T, TChainOut>
>;

export type ProviderChain<T extends readonly ProviderLike[]> =
	HasWrappers<T> extends true
		? Wrapper<ToVoidOrEmpty<InputOfChain<T>>, ToVoid<OutputOfChain<T>>>
		: ProviderFn<ToVoidOrEmpty<InputOfChain<T>>, ToVoid<OutputOfChain<T>>>;

// =================================================================================================
// ChainInput

/**
 * Allows specifying an input type for a provider chain.
 *
 * @example
 * ```ts
 * const chain = Providers(ChainInput<{ a: number }>(), provideSomething, ({ a }) => ({ b: a + 1 }));
 * ```
 */
export function ChainInput<T extends object>(): ProviderFn<T, T> {
	return async (input: T) => input;
}

// =================================================================================================
// Providers

type ChainableFrom<T extends readonly ProviderLike[]> = ProviderLike<OutputOfChain<T>, any>;

// 0 providers
export function Providers(): ProviderFn<void, void>;

// 1 provider
export function Providers<A extends ProviderLike>(a: A): ProviderChain<[A]>;

// 2 providers
export function Providers<A extends ProviderLike, B extends ChainableFrom<[A]>>(
	a: A,
	b: B
): ProviderChain<[A, B]>;

// 3 providers
export function Providers<
	A extends ProviderLike,
	B extends ChainableFrom<[A]>,
	C extends ChainableFrom<[A, B]>
>(a: A, b: B, c: C): ProviderChain<[A, B, C]>;

// 4 providers
export function Providers<
	A extends ProviderLike,
	B extends ChainableFrom<[A]>,
	C extends ChainableFrom<[A, B]>,
	D extends ChainableFrom<[A, B, C]>
>(a: A, b: B, c: C, d: D): ProviderChain<[A, B, C, D]>;

// 5 providers
export function Providers<
	A extends ProviderLike,
	B extends ChainableFrom<[A]>,
	C extends ChainableFrom<[A, B]>,
	D extends ChainableFrom<[A, B, C]>,
	E extends ChainableFrom<[A, B, C, D]>
>(a: A, b: B, c: C, d: D, e: E): ProviderChain<[A, B, C, D, E]>;

// 6 providers
export function Providers<
	A extends ProviderLike,
	B extends ChainableFrom<[A]>,
	C extends ChainableFrom<[A, B]>,
	D extends ChainableFrom<[A, B, C]>,
	E extends ChainableFrom<[A, B, C, D]>,
	F extends ChainableFrom<[A, B, C, D, E]>
>(a: A, b: B, c: C, d: D, e: E, f: F): ProviderChain<[A, B, C, D, E, F]>;

// 7 providers
export function Providers<
	A extends ProviderLike,
	B extends ChainableFrom<[A]>,
	C extends ChainableFrom<[A, B]>,
	D extends ChainableFrom<[A, B, C]>,
	E extends ChainableFrom<[A, B, C, D]>,
	F extends ChainableFrom<[A, B, C, D, E]>,
	G extends ChainableFrom<[A, B, C, D, E, F]>
>(a: A, b: B, c: C, d: D, e: E, f: F, g: G): ProviderChain<[A, B, C, D, E, F, G]>;

// 8 providers
export function Providers<
	A extends ProviderLike,
	B extends ChainableFrom<[A]>,
	C extends ChainableFrom<[A, B]>,
	D extends ChainableFrom<[A, B, C]>,
	E extends ChainableFrom<[A, B, C, D]>,
	F extends ChainableFrom<[A, B, C, D, E]>,
	G extends ChainableFrom<[A, B, C, D, E, F]>,
	H extends ChainableFrom<[A, B, C, D, E, F, G]>
>(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H): ProviderChain<[A, B, C, D, E, F, G, H]>;

// 9 providers
export function Providers<
	A extends ProviderLike,
	B extends ChainableFrom<[A]>,
	C extends ChainableFrom<[A, B]>,
	D extends ChainableFrom<[A, B, C]>,
	E extends ChainableFrom<[A, B, C, D]>,
	F extends ChainableFrom<[A, B, C, D, E]>,
	G extends ChainableFrom<[A, B, C, D, E, F]>,
	H extends ChainableFrom<[A, B, C, D, E, F, G]>,
	I extends ChainableFrom<[A, B, C, D, E, F, G, H]>
>(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I): ProviderChain<[A, B, C, D, E, F, G, H, I]>;

// 10 providers
export function Providers<
	A extends ProviderLike,
	B extends ChainableFrom<[A]>,
	C extends ChainableFrom<[A, B]>,
	D extends ChainableFrom<[A, B, C]>,
	E extends ChainableFrom<[A, B, C, D]>,
	F extends ChainableFrom<[A, B, C, D, E]>,
	G extends ChainableFrom<[A, B, C, D, E, F]>,
	H extends ChainableFrom<[A, B, C, D, E, F, G]>,
	I extends ChainableFrom<[A, B, C, D, E, F, G, H]>,
	J extends ChainableFrom<[A, B, C, D, E, F, G, H, I]>
>(
	a: A,
	b: B,
	c: C,
	d: D,
	e: E,
	f: F,
	g: G,
	h: H,
	i: I,
	j: J
): ProviderChain<[A, B, C, D, E, F, G, H, I, J]>;

// 11 providers
export function Providers<
	A extends ProviderLike,
	B extends ChainableFrom<[A]>,
	C extends ChainableFrom<[A, B]>,
	D extends ChainableFrom<[A, B, C]>,
	E extends ChainableFrom<[A, B, C, D]>,
	F extends ChainableFrom<[A, B, C, D, E]>,
	G extends ChainableFrom<[A, B, C, D, E, F]>,
	H extends ChainableFrom<[A, B, C, D, E, F, G]>,
	I extends ChainableFrom<[A, B, C, D, E, F, G, H]>,
	J extends ChainableFrom<[A, B, C, D, E, F, G, H, I]>,
	K extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J]>
>(
	a: A,
	b: B,
	c: C,
	d: D,
	e: E,
	f: F,
	g: G,
	h: H,
	i: I,
	j: J,
	k: K
): ProviderChain<[A, B, C, D, E, F, G, H, I, J, K]>;

// 12 providers
export function Providers<
	A extends ProviderLike,
	B extends ChainableFrom<[A]>,
	C extends ChainableFrom<[A, B]>,
	D extends ChainableFrom<[A, B, C]>,
	E extends ChainableFrom<[A, B, C, D]>,
	F extends ChainableFrom<[A, B, C, D, E]>,
	G extends ChainableFrom<[A, B, C, D, E, F]>,
	H extends ChainableFrom<[A, B, C, D, E, F, G]>,
	I extends ChainableFrom<[A, B, C, D, E, F, G, H]>,
	J extends ChainableFrom<[A, B, C, D, E, F, G, H, I]>,
	K extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J]>,
	L extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K]>
>(
	a: A,
	b: B,
	c: C,
	d: D,
	e: E,
	f: F,
	g: G,
	h: H,
	i: I,
	j: J,
	k: K,
	l: L
): ProviderChain<[A, B, C, D, E, F, G, H, I, J, K, L]>;

// 13-20 providers (additional overloads for completeness)
export function Providers<
	A extends ProviderLike,
	B extends ChainableFrom<[A]>,
	C extends ChainableFrom<[A, B]>,
	D extends ChainableFrom<[A, B, C]>,
	E extends ChainableFrom<[A, B, C, D]>,
	F extends ChainableFrom<[A, B, C, D, E]>,
	G extends ChainableFrom<[A, B, C, D, E, F]>,
	H extends ChainableFrom<[A, B, C, D, E, F, G]>,
	I extends ChainableFrom<[A, B, C, D, E, F, G, H]>,
	J extends ChainableFrom<[A, B, C, D, E, F, G, H, I]>,
	K extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J]>,
	L extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K]>,
	M extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K, L]>
>(
	a: A,
	b: B,
	c: C,
	d: D,
	e: E,
	f: F,
	g: G,
	h: H,
	i: I,
	j: J,
	k: K,
	l: L,
	m: M
): ProviderChain<[A, B, C, D, E, F, G, H, I, J, K, L, M]>;

export function Providers<
	A extends ProviderLike,
	B extends ChainableFrom<[A]>,
	C extends ChainableFrom<[A, B]>,
	D extends ChainableFrom<[A, B, C]>,
	E extends ChainableFrom<[A, B, C, D]>,
	F extends ChainableFrom<[A, B, C, D, E]>,
	G extends ChainableFrom<[A, B, C, D, E, F]>,
	H extends ChainableFrom<[A, B, C, D, E, F, G]>,
	I extends ChainableFrom<[A, B, C, D, E, F, G, H]>,
	J extends ChainableFrom<[A, B, C, D, E, F, G, H, I]>,
	K extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J]>,
	L extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K]>,
	M extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K, L]>,
	N extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K, L, M]>
>(
	a: A,
	b: B,
	c: C,
	d: D,
	e: E,
	f: F,
	g: G,
	h: H,
	i: I,
	j: J,
	k: K,
	l: L,
	m: M,
	n: N
): ProviderChain<[A, B, C, D, E, F, G, H, I, J, K, L, M, N]>;

export function Providers<
	A extends ProviderLike,
	B extends ChainableFrom<[A]>,
	C extends ChainableFrom<[A, B]>,
	D extends ChainableFrom<[A, B, C]>,
	E extends ChainableFrom<[A, B, C, D]>,
	F extends ChainableFrom<[A, B, C, D, E]>,
	G extends ChainableFrom<[A, B, C, D, E, F]>,
	H extends ChainableFrom<[A, B, C, D, E, F, G]>,
	I extends ChainableFrom<[A, B, C, D, E, F, G, H]>,
	J extends ChainableFrom<[A, B, C, D, E, F, G, H, I]>,
	K extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J]>,
	L extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K]>,
	M extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K, L]>,
	N extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K, L, M]>,
	O extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K, L, M, N]>
>(
	a: A,
	b: B,
	c: C,
	d: D,
	e: E,
	f: F,
	g: G,
	h: H,
	i: I,
	j: J,
	k: K,
	l: L,
	m: M,
	n: N,
	o: O
): ProviderChain<[A, B, C, D, E, F, G, H, I, J, K, L, M, N, O]>;

export function Providers<
	A extends ProviderLike,
	B extends ChainableFrom<[A]>,
	C extends ChainableFrom<[A, B]>,
	D extends ChainableFrom<[A, B, C]>,
	E extends ChainableFrom<[A, B, C, D]>,
	F extends ChainableFrom<[A, B, C, D, E]>,
	G extends ChainableFrom<[A, B, C, D, E, F]>,
	H extends ChainableFrom<[A, B, C, D, E, F, G]>,
	I extends ChainableFrom<[A, B, C, D, E, F, G, H]>,
	J extends ChainableFrom<[A, B, C, D, E, F, G, H, I]>,
	K extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J]>,
	L extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K]>,
	M extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K, L]>,
	N extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K, L, M]>,
	O extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K, L, M, N]>,
	P extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K, L, M, N, O]>
>(
	a: A,
	b: B,
	c: C,
	d: D,
	e: E,
	f: F,
	g: G,
	h: H,
	i: I,
	j: J,
	k: K,
	l: L,
	m: M,
	n: N,
	o: O,
	p: P
): ProviderChain<[A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P]>;

export function Providers<
	A extends ProviderLike,
	B extends ChainableFrom<[A]>,
	C extends ChainableFrom<[A, B]>,
	D extends ChainableFrom<[A, B, C]>,
	E extends ChainableFrom<[A, B, C, D]>,
	F extends ChainableFrom<[A, B, C, D, E]>,
	G extends ChainableFrom<[A, B, C, D, E, F]>,
	H extends ChainableFrom<[A, B, C, D, E, F, G]>,
	I extends ChainableFrom<[A, B, C, D, E, F, G, H]>,
	J extends ChainableFrom<[A, B, C, D, E, F, G, H, I]>,
	K extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J]>,
	L extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K]>,
	M extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K, L]>,
	N extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K, L, M]>,
	O extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K, L, M, N]>,
	P extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K, L, M, N, O]>,
	Q extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P]>
>(
	a: A,
	b: B,
	c: C,
	d: D,
	e: E,
	f: F,
	g: G,
	h: H,
	i: I,
	j: J,
	k: K,
	l: L,
	m: M,
	n: N,
	o: O,
	p: P,
	q: Q
): ProviderChain<[A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q]>;

export function Providers<
	A extends ProviderLike,
	B extends ChainableFrom<[A]>,
	C extends ChainableFrom<[A, B]>,
	D extends ChainableFrom<[A, B, C]>,
	E extends ChainableFrom<[A, B, C, D]>,
	F extends ChainableFrom<[A, B, C, D, E]>,
	G extends ChainableFrom<[A, B, C, D, E, F]>,
	H extends ChainableFrom<[A, B, C, D, E, F, G]>,
	I extends ChainableFrom<[A, B, C, D, E, F, G, H]>,
	J extends ChainableFrom<[A, B, C, D, E, F, G, H, I]>,
	K extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J]>,
	L extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K]>,
	M extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K, L]>,
	N extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K, L, M]>,
	O extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K, L, M, N]>,
	P extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K, L, M, N, O]>,
	Q extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P]>,
	R extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q]>
>(
	a: A,
	b: B,
	c: C,
	d: D,
	e: E,
	f: F,
	g: G,
	h: H,
	i: I,
	j: J,
	k: K,
	l: L,
	m: M,
	n: N,
	o: O,
	p: P,
	q: Q,
	r: R
): ProviderChain<[A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R]>;

export function Providers<
	A extends ProviderLike,
	B extends ChainableFrom<[A]>,
	C extends ChainableFrom<[A, B]>,
	D extends ChainableFrom<[A, B, C]>,
	E extends ChainableFrom<[A, B, C, D]>,
	F extends ChainableFrom<[A, B, C, D, E]>,
	G extends ChainableFrom<[A, B, C, D, E, F]>,
	H extends ChainableFrom<[A, B, C, D, E, F, G]>,
	I extends ChainableFrom<[A, B, C, D, E, F, G, H]>,
	J extends ChainableFrom<[A, B, C, D, E, F, G, H, I]>,
	K extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J]>,
	L extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K]>,
	M extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K, L]>,
	N extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K, L, M]>,
	O extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K, L, M, N]>,
	P extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K, L, M, N, O]>,
	Q extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P]>,
	R extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q]>,
	S extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R]>
>(
	a: A,
	b: B,
	c: C,
	d: D,
	e: E,
	f: F,
	g: G,
	h: H,
	i: I,
	j: J,
	k: K,
	l: L,
	m: M,
	n: N,
	o: O,
	p: P,
	q: Q,
	r: R,
	s: S
): ProviderChain<[A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S]>;

export function Providers<
	A extends ProviderLike,
	B extends ChainableFrom<[A]>,
	C extends ChainableFrom<[A, B]>,
	D extends ChainableFrom<[A, B, C]>,
	E extends ChainableFrom<[A, B, C, D]>,
	F extends ChainableFrom<[A, B, C, D, E]>,
	G extends ChainableFrom<[A, B, C, D, E, F]>,
	H extends ChainableFrom<[A, B, C, D, E, F, G]>,
	I extends ChainableFrom<[A, B, C, D, E, F, G, H]>,
	J extends ChainableFrom<[A, B, C, D, E, F, G, H, I]>,
	K extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J]>,
	L extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K]>,
	M extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K, L]>,
	N extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K, L, M]>,
	O extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K, L, M, N]>,
	P extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K, L, M, N, O]>,
	Q extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P]>,
	R extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q]>,
	S extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R]>,
	T extends ChainableFrom<[A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S]>
>(
	a: A,
	b: B,
	c: C,
	d: D,
	e: E,
	f: F,
	g: G,
	h: H,
	i: I,
	j: J,
	k: K,
	l: L,
	m: M,
	n: N,
	o: O,
	p: P,
	q: Q,
	r: R,
	s: S,
	t: T
): ProviderChain<[A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T]>;

// Implementation
export function Providers(...providers: ProviderLike[]): any {
	const hasWrappers = providers.some(isWrapper);

	if (hasWrappers) {
		return {
			$type: 'Wrapper',
			wrapperFn: async (userFn: (context: any) => any, input: any) => {
				const [firstProvider, ...remainingProviders] = providers;

				const handlerFn = async (input: any) => {
					const nextProvider = remainingProviders.shift();

					if (nextProvider) {
						return await runWithProvider(nextProvider, handlerFn as any, input);
					}

					return await userFn(input);
				};

				return await runWithProvider(firstProvider, handlerFn as any, input);
			}
		} satisfies Wrapper<any, any>;
	} else {
		return async (input: any) => {
			const disposers: (() => void | Promise<void>)[] = [];
			const asyncDisposers: (() => Promise<void>)[] = [];

			let context = { ...input };

			for (const provider of providers) {
				await runInContext(context, async () => {
					const { dispose, asyncDispose, rest } = extractDispose(
						(await (provider as ProviderFn<any, any>)(context)) ?? {}
					);
					context = { ...context, ...rest };
					if (dispose != null) {
						disposers.push(dispose);
					}
					if (asyncDispose != null) {
						asyncDisposers.push(asyncDispose);
					}
				});
			}

			return {
				...context,
				...(disposers.length > 0
					? {
							[Symbol.dispose]: async () => {
								for (const dispose of disposers) {
									await dispose();
								}
							}
						}
					: {}),
				...(asyncDisposers.length > 0
					? {
							[Symbol.asyncDispose]: async () => {
								for (const asyncDispose of asyncDisposers) {
									await asyncDispose();
								}
							}
						}
					: {})
			};
		};
	}
}

// =================================================================================================
// Exports

export { runWithProvider, wrapWithProvider };

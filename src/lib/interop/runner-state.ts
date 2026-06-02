import { z } from 'zod';

import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * Top-level state for a runnable checklist page. Drives the right-column
 * banner, CTA, and overall colorway.
 */
export const ChecklistRunState = ZodFactory(
	z.enum(['idle', 'awaiting-wallet', 'wallet-connected', 'complete', 'error'])
);
export type ChecklistRunState = ReturnType<typeof ChecklistRunState>;

/** State of a single step in the right column. */
export const StepRunState = ZodFactory(z.enum(['pending', 'in-flight', 'complete', 'skipped']));
export type StepRunState = ReturnType<typeof StepRunState>;

/**
 * Subset of the transaction-service `ExchangeRecord` we depend on for
 * derivation. Defining this locally (rather than importing the real
 * type) keeps `runner-state.ts` free of any server-only imports so it
 * can be used in client code, components, and stories.
 */
export type RunnerExchangeView = {
	state: 'pending' | 'active' | 'complete' | 'invalid';
	variables?: Record<string, unknown>;
};

export type RunStateDerivation = {
	run: ChecklistRunState;
	perStep: StepRunState[];
};

/**
 * Map a transaction-service exchange record + step count to the
 * `(run, perStep)` shape the UI consumes. Pure function — depends only
 * on its inputs.
 *
 * `stepCount` is the number of steps on the left column (the source
 * checklist). The mapping below biases toward telling a clear story:
 * one step in flight at a time, prior steps complete, later steps
 * pending, until the whole exchange completes.
 */
export function deriveRunStateFromExchange(
	exchange: RunnerExchangeView | null,
	stepCount: number
): RunStateDerivation {
	if (!exchange) {
		return { run: 'idle', perStep: filledArray(stepCount, 'pending') };
	}

	if (exchange.state === 'invalid') {
		return { run: 'error', perStep: filledArray(stepCount, 'skipped') };
	}

	if (exchange.state === 'complete') {
		return { run: 'complete', perStep: filledArray(stepCount, 'complete') };
	}

	const hasHolderDid = !!exchange.variables?.holderDid || !!exchange.variables?.didAuthHolderDid;

	if (exchange.state === 'pending') {
		// Created but the wallet has not made any request yet. Step 1 in flight.
		return {
			run: 'awaiting-wallet',
			perStep: stepStates(stepCount, /* inFlightIndex */ 0)
		};
	}

	// state === 'active' — the wallet has touched the exchange.
	if (hasHolderDid) {
		// DIDAuth received → step 4 (final pre-completion) in flight.
		return {
			run: 'wallet-connected',
			perStep: stepStates(stepCount, Math.min(stepCount - 1, 3))
		};
	}

	// Wallet fetched protocols but hasn't sent DIDAuth yet → step 3 in flight.
	return {
		run: 'wallet-connected',
		perStep: stepStates(stepCount, Math.min(stepCount - 1, 2))
	};
}

function filledArray<T>(length: number, value: T): T[] {
	return Array.from({ length }, () => value);
}

function stepStates(length: number, inFlightIndex: number): StepRunState[] {
	return Array.from({ length }, (_, i) => {
		if (i < inFlightIndex) return 'complete';
		if (i === inFlightIndex) return 'in-flight';
		return 'pending';
	});
}

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
export const StepRunState = ZodFactory(
	z.enum(['pending', 'in-flight', 'complete', 'skipped', 'failed'])
);
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
 * Which transaction-service workflow the exchange belongs to. Threaded from
 * the page/GET route so a `verify` (presentation) exchange derives run-state
 * from its own variables (`results`/`oid4vp`/`verifyTask`) rather than the
 * issuance (`claim`) fields. Kept as a local literal (not the server `WorkflowId`
 * type) so this module stays client-safe.
 */
export type RunnerWorkflowId = 'claim' | 'verify';

/**
 * Runtime state the OID4VCI 1.0 pre-authorized-code flow records under
 * `variables.oid4vci`. Unlike VCALM, that flow never flips the exchange to
 * `active`; progress is observable only through these fields (presence is
 * used as a coarse "this stage happened" proxy).
 */
type Oid4vciState = {
	preAuthorizedCode?: string;
	codeUsed?: boolean;
	accessToken?: string;
	cNonce?: string;
	nonceUsed?: boolean;
};

/** Read `variables.oid4vci` as an object, or `undefined` for non-OID4VCI exchanges. */
function oid4vciStateOf(exchange: RunnerExchangeView): Oid4vciState | undefined {
	const v = exchange.variables?.oid4vci;
	return v && typeof v === 'object' ? (v as Oid4vciState) : undefined;
}

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
	stepCount: number,
	workflowId?: RunnerWorkflowId
): RunStateDerivation {
	if (!exchange) {
		return { run: 'idle', perStep: filledArray(stepCount, 'pending') };
	}

	// Verify (presentation) exchanges record progress under `variables.results`
	// / `oid4vp` / `verifyTask` — never the issuance `oid4vci`/`holderDid` fields
	// the branches below key off. Route them to their own derivation, which keeps
	// the two-phase `active`+`verifyTask` window non-terminal so polling continues.
	if (isVerifyExchange(exchange, workflowId)) {
		return deriveVerifyRunState(exchange, stepCount);
	}

	if (exchange.state === 'invalid') {
		return { run: 'error', perStep: filledArray(stepCount, 'skipped') };
	}

	if (exchange.state === 'complete') {
		return { run: 'complete', perStep: filledArray(stepCount, 'complete') };
	}

	// OID4VCI exchanges stay `pending` until completion, so map progress from
	// `variables.oid4vci` instead of the state machine. `complete`/`invalid`
	// (protocol-agnostic) are handled above; this branch covers the in-flight
	// stages. Non-OID4VCI exchanges fall through to the VCALM/DIDAuth logic.
	const oid4vci = oid4vciStateOf(exchange);
	if (oid4vci) {
		if (oid4vci.cNonce || oid4vci.codeUsed || oid4vci.accessToken) {
			// Token redeemed (and maybe nonce fetched) → requesting credential.
			return {
				run: 'wallet-connected',
				perStep: stepStates(stepCount, Math.min(stepCount - 1, 2))
			};
		}
		if (oid4vci.preAuthorizedCode) {
			// Offer fetched, no token yet → authorization/token step in flight.
			return {
				run: 'wallet-connected',
				perStep: stepStates(stepCount, Math.min(stepCount - 1, 1))
			};
		}
		// `oid4vci` object exists but empty → awaiting first wallet contact.
		return { run: 'awaiting-wallet', perStep: stepStates(stepCount, 0) };
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

/**
 * A verify exchange is identified either by a threaded `workflowId === 'verify'`
 * or by the presence of any verify-only variable the transaction service sets
 * (`results`, `oid4vp`, `verifyTask`). Issuance (`claim`) exchanges never set
 * these, so they fall through to the OID4VCI/VCALM logic.
 */
function isVerifyExchange(
	exchange: RunnerExchangeView,
	workflowId: RunnerWorkflowId | undefined
): boolean {
	if (workflowId === 'verify') return true;
	const v = exchange.variables;
	return !!(v?.results || v?.oid4vp || v?.verifyTask);
}

/** Read `variables.oid4vp` (OID4VP presentation progress) as an object. */
function oid4vpStateOf(exchange: RunnerExchangeView): { state?: unknown } | undefined {
	const v = exchange.variables?.oid4vp;
	return v && typeof v === 'object' ? (v as { state?: unknown }) : undefined;
}

/**
 * Map a verify (presentation) exchange to `(run, perStep)`.
 *
 * Critically, the two-phase `active` + `variables.verifyTask` window (the async
 * Open Badges verification pass) maps to a NON-terminal `wallet-connected` with
 * the final step in-flight — never `complete`/`error` — so `pollExchange` keeps
 * polling until the worker settles the exchange to `complete`/`invalid`.
 */
function deriveVerifyRunState(exchange: RunnerExchangeView, stepCount: number): RunStateDerivation {
	if (exchange.state === 'invalid') {
		return { run: 'error', perStep: filledArray(stepCount, 'skipped') };
	}
	if (exchange.state === 'complete') {
		return { run: 'complete', perStep: filledArray(stepCount, 'complete') };
	}

	const finalStep = Math.max(0, stepCount - 1);

	if (exchange.state === 'active') {
		// Two-phase: sync pass persisted `results.default` but held `active` with a
		// queued `verifyTask`. Final step (delivery/verification) in-flight — NEVER
		// terminal, or polling tears down before the async pass settles.
		if (exchange.variables?.verifyTask) {
			return { run: 'wallet-connected', perStep: stepStates(stepCount, finalStep) };
		}
		// `active` without a `verifyTask` — wallet is presenting (transient).
		return { run: 'wallet-connected', perStep: stepStates(stepCount, Math.min(finalStep, 2)) };
	}

	// state === 'pending'
	if (oid4vpStateOf(exchange)) {
		// OID4VP authorization request fetched → engagement done, presentation in-flight.
		return { run: 'wallet-connected', perStep: stepStates(stepCount, Math.min(finalStep, 1)) };
	}
	// Created but the wallet has not fetched the request yet.
	return { run: 'awaiting-wallet', perStep: stepStates(stepCount, 0) };
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

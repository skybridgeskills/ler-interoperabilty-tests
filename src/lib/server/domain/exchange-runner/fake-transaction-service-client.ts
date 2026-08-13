import { fakeClaimProtocols } from './fake-claim-protocols.js';
import { oid4vciHooks } from './fake-oid4vci-hooks.js';
import {
	clone,
	type ExchangeStore,
	newUuid,
	requireRecord
} from './fake-transaction-service-shared.js';
import { fakeVerifyProtocols, verifyHooks } from './fake-verify-hooks.js';
import {
	type CreateExchangeResult,
	type CreateIssuanceExchangeRequest,
	type CreateVerificationExchangeRequest,
	type ExchangeRecord,
	TransactionServiceError,
	type TransactionServiceClient,
	type WorkflowId
} from './transaction-service-client.js';

/**
 * Test-only mutators on the fake client. The factory return type is the
 * union of the production interface plus these hooks; production code
 * paths only see {@link TransactionServiceClient}.
 */
export interface FakeTransactionServiceTestHooks {
	advanceToActive(exchangeId: string, vars?: Record<string, unknown>): void;
	advanceToComplete(exchangeId: string, vars?: Record<string, unknown>): void;
	advanceToInvalid(exchangeId: string, reason?: string): void;
	/**
	 * Verify sync pass: hold at `active` with a queued `verifyTask` (the async
	 * Open Badges pass window).
	 */
	advanceVerifyToActive(
		exchangeId: string,
		opts?: { openBadgesCredentialIndices?: number[] }
	): void;
	/**
	 * Verify async pass settled: finalize to `complete`/`invalid` with a
	 * populated `variables.results.default`. Pass `{ verified: false }` for the
	 * invalid outcome.
	 */
	advanceVerifyToComplete(
		exchangeId: string,
		opts?: {
			verified?: boolean;
			verifiablePresentation?: Record<string, unknown>;
			summary?: unknown[];
		}
	): void;
	/**
	 * OID4VCI: wallet fetched the credential offer → pre-auth code minted.
	 * State stays `pending` (mirrors the real service).
	 */
	advanceOid4vciOfferFetched(exchangeId: string): void;
	/** OID4VCI: token endpoint redeemed the code → access token issued (still `pending`). */
	advanceOid4vciTokenIssued(exchangeId: string): void;
	/** OID4VCI: nonce endpoint issued a c_nonce, credential request imminent (still `pending`). */
	advanceOid4vciNonceIssued(exchangeId: string): void;
	/** OID4VCI: credential endpoint issued the VC → exchange `complete`. */
	advanceOid4vciComplete(exchangeId: string, vars?: Record<string, unknown>): void;
	getStored(exchangeId: string): ExchangeRecord | undefined;
	listExchanges(): ExchangeRecord[];
	clear(): void;
}

export type FakeTransactionServiceClient = TransactionServiceClient &
	FakeTransactionServiceTestHooks;

/**
 * In-memory VCALM/VC-API shaped fake. Mirrors the response shape of the
 * real transaction service exactly so consumers (server endpoints, the
 * runner state derivation, storybook stories) behave identically against
 * either implementation.
 */
export function FakeTransactionServiceClient({
	host = 'http://fake.test'
}: { host?: string } = {}): FakeTransactionServiceClient {
	const store: ExchangeStore = new Map<string, ExchangeRecord>();

	async function createIssuanceExchange(
		req: CreateIssuanceExchangeRequest
	): Promise<CreateExchangeResult> {
		const exchangeId = newUuid();
		// Record what the caller asked to mint, exactly as the real service stores
		// it in `variables`, so tests can assert on the credential document and the
		// tamper mode rather than only on the resulting protocols.
		store.set(exchangeId, {
			exchangeId,
			workflowId: 'claim',
			state: 'pending',
			variables: {
				retrievalId: req.retrievalId,
				vc: JSON.stringify(req.credential),
				...(req.tamper ? { tamper: req.tamper } : {}),
				...(req.exchangeIdPrefix ? { exchangeIdPrefix: req.exchangeIdPrefix } : {})
			}
		});
		return {
			exchangeId,
			workflowId: 'claim',
			protocols: fakeClaimProtocols(host, exchangeId)
		};
	}

	async function createVerificationExchange(
		req: CreateVerificationExchangeRequest
	): Promise<CreateExchangeResult> {
		const exchangeId = newUuid();
		store.set(exchangeId, {
			exchangeId,
			workflowId: 'verify',
			state: 'pending',
			variables: {
				vprCredentialType: req.vprCredentialType,
				vprContext: req.vprContext,
				...(req.trustedIssuers ? { trustedIssuers: req.trustedIssuers } : {}),
				...(req.vprClaims ? { vprClaims: req.vprClaims } : {})
			}
		});
		return {
			exchangeId,
			workflowId: 'verify',
			protocols: fakeVerifyProtocols(host, exchangeId, req.vprCredentialType)
		};
	}

	async function getExchange(_workflowId: WorkflowId, exchangeId: string): Promise<ExchangeRecord> {
		const record = store.get(exchangeId);
		if (!record) throw new TransactionServiceError(404, `Exchange ${exchangeId} not found`);
		return clone(record);
	}

	/**
	 * Attach-mode read: rebuild the protocols of an exchange already in the
	 * store. Mirrors the real service, which resolves the exchange under the
	 * workflow in the path — an id looked up under the wrong workflow is a 404,
	 * not a silent cross-workflow answer.
	 */
	async function getProtocols(
		workflowId: WorkflowId,
		exchangeId: string
	): Promise<CreateExchangeResult> {
		const record = store.get(exchangeId);
		if (!record || (record.workflowId ?? workflowId) !== workflowId) {
			throw new TransactionServiceError(404, `Exchange ${exchangeId} not found`);
		}
		if (workflowId === 'verify') {
			const requested = record.variables?.vprCredentialType;
			return {
				exchangeId,
				workflowId,
				protocols: fakeVerifyProtocols(host, exchangeId, asStringArray(requested))
			};
		}
		return { exchangeId, workflowId, protocols: fakeClaimProtocols(host, exchangeId) };
	}

	function advanceToActive(exchangeId: string, vars: Record<string, unknown> = {}): void {
		const record = requireRecord(store, exchangeId);
		store.set(exchangeId, {
			...record,
			state: 'active',
			variables: { ...(record.variables ?? {}), ...vars }
		});
	}

	function advanceToComplete(exchangeId: string, vars: Record<string, unknown> = {}): void {
		const record = requireRecord(store, exchangeId);
		store.set(exchangeId, {
			...record,
			state: 'complete',
			variables: { ...(record.variables ?? {}), ...vars }
		});
	}

	function advanceToInvalid(exchangeId: string, reason = 'fake-test-failure'): void {
		const record = requireRecord(store, exchangeId);
		store.set(exchangeId, {
			...record,
			state: 'invalid',
			variables: { ...(record.variables ?? {}), invalidReason: reason }
		});
	}

	function getStored(exchangeId: string): ExchangeRecord | undefined {
		const record = store.get(exchangeId);
		return record ? clone(record) : undefined;
	}

	function listExchanges(): ExchangeRecord[] {
		return [...store.values()].map(clone);
	}

	function clear(): void {
		store.clear();
	}

	return {
		createIssuanceExchange,
		createVerificationExchange,
		getExchange,
		getProtocols,
		advanceToActive,
		advanceToComplete,
		advanceToInvalid,
		...verifyHooks(store),
		...oid4vciHooks(store),
		getStored,
		listExchanges,
		clear
	};
}

/** Narrow a stored `variables` entry back to the `string[]` the mint put there. */
function asStringArray(value: unknown): string[] {
	return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

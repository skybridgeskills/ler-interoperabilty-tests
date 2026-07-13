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
		store.set(exchangeId, {
			exchangeId,
			workflowId: 'claim',
			state: 'pending',
			variables: { retrievalId: req.retrievalId }
		});
		const credentialOfferUri = `${host}/workflows/claim/exchanges/${exchangeId}/openid/credential-offer`;
		const oid4vciDeepLink = `openid-credential-offer://?credential_offer_uri=${encodeURIComponent(
			credentialOfferUri
		)}`;
		return {
			exchangeId,
			workflowId: 'claim',
			protocols: {
				iu: `${host}/interactions/${exchangeId}`,
				vcapi: `${host}/workflows/claim/exchanges/${exchangeId}`,
				lcw: `${host}/lcw?xid=${exchangeId}`,
				OID4VCI: oid4vciDeepLink,
				verifiablePresentationRequest: {
					query: { type: 'DIDAuthentication' },
					challenge: `challenge-${exchangeId}`,
					domain: host
				}
			}
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

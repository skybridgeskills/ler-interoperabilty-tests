import {
	type CreateExchangeRequest,
	type CreateExchangeResult,
	type ExchangeRecord,
	TransactionServiceError,
	type TransactionServiceClient
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
	const store = new Map<string, ExchangeRecord>();

	async function createExchange(req: CreateExchangeRequest): Promise<CreateExchangeResult> {
		const exchangeId = newUuid();
		const record: ExchangeRecord = {
			exchangeId,
			workflowId: 'claim',
			state: 'pending',
			variables: { retrievalId: req.retrievalId }
		};
		store.set(exchangeId, record);
		const credentialOfferUri = `${host}/workflows/claim/exchanges/${exchangeId}/openid/credential-offer`;
		const oid4vciDeepLink = `openid-credential-offer://?credential_offer_uri=${encodeURIComponent(
			credentialOfferUri
		)}`;
		return {
			exchangeId,
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

	async function getExchange(exchangeId: string): Promise<ExchangeRecord> {
		const record = store.get(exchangeId);
		if (!record) {
			throw new TransactionServiceError(404, `Exchange ${exchangeId} not found`);
		}
		return clone(record);
	}

	function advanceToActive(exchangeId: string, vars: Record<string, unknown> = {}): void {
		const record = requireRecord(exchangeId);
		store.set(exchangeId, {
			...record,
			state: 'active',
			variables: { ...(record.variables ?? {}), ...vars }
		});
	}

	function advanceToComplete(exchangeId: string, vars: Record<string, unknown> = {}): void {
		const record = requireRecord(exchangeId);
		store.set(exchangeId, {
			...record,
			state: 'complete',
			variables: { ...(record.variables ?? {}), ...vars }
		});
	}

	function advanceToInvalid(exchangeId: string, reason = 'fake-test-failure'): void {
		const record = requireRecord(exchangeId);
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

	function requireRecord(exchangeId: string): ExchangeRecord {
		const record = store.get(exchangeId);
		if (!record) throw new TransactionServiceError(404, `Exchange ${exchangeId} not found`);
		return record;
	}

	return {
		createExchange,
		getExchange,
		advanceToActive,
		advanceToComplete,
		advanceToInvalid,
		getStored,
		listExchanges,
		clear
	};
}

function newUuid(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `fake-${Math.random().toString(36).slice(2, 12)}`;
}

function clone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

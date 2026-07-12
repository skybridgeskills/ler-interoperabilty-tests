import { type ExchangeRecord, TransactionServiceError } from './transaction-service-client.js';

/** In-memory backing store shared by the fake client and its hook modules. */
export type ExchangeStore = Map<string, ExchangeRecord>;

/** UUID with a deterministic-ish fallback when `crypto.randomUUID` is unavailable. */
export function newUuid(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `fake-${Math.random().toString(36).slice(2, 12)}`;
}

/** Deep clone so callers can mutate returned records without affecting storage. */
export function clone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

/** Fetch a stored record or throw the same 404 shape the real client surfaces. */
export function requireRecord(store: ExchangeStore, exchangeId: string): ExchangeRecord {
	const record = store.get(exchangeId);
	if (!record) throw new TransactionServiceError(404, `Exchange ${exchangeId} not found`);
	return record;
}

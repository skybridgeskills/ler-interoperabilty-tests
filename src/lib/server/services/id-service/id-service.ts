/**
 * Source of opaque identifiers (UUIDs, request IDs, short tokens). Inject so
 * tests can assert deterministic IDs.
 */
export interface IdService {
	uuid: () => string;
	short: (prefix: string) => string;
}

/** Real ID service backed by `crypto.randomUUID()`. */
export function RealIdService(): IdService {
	return {
		uuid: () => crypto.randomUUID(),
		short: (prefix) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`
	};
}

/**
 * Deterministic ID service for tests. UUIDs are zero-padded counters so they
 * sort lexicographically in the order they were issued.
 */
export function FakeIdService(): IdService {
	let counter = 0;
	return {
		uuid: () => `00000000-0000-0000-0000-${String(++counter).padStart(12, '0')}`,
		short: (prefix) => `${prefix}-${String(++counter).padStart(8, '0')}`
	};
}

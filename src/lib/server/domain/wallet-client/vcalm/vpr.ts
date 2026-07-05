/**
 * Tolerant parsing + lenient matching for a VCALM `verifiablePresentationRequest`
 * (VPR). Real VPRs vary in shape, so this normalizes defensively rather than
 * validating strictly: a `query` may be a single object or an array; a
 * `QueryByExample` carries its credential template(s) under `example` directly
 * or under `credentialQuery[].example`. Not a full Presentation Exchange
 * implementation — enough to recognize a credential-presentation request for an
 * `OpenBadgeCredential` and a DID-authentication query.
 */

/** One entry in a VPR `query`. QueryByExample carries example credential template(s). */
export type VprQuery = {
	type?: string;
	credentialQuery?: unknown;
	example?: unknown;
	[key: string]: unknown;
};

/** A normalized VPR: challenge/domain for the holder proof + the flattened query list. */
export type ParsedVpr = {
	challenge?: string;
	domain?: string;
	queries: VprQuery[];
};

/** The credential type the suite's seeded fixture satisfies. */
const TARGET_TYPE = 'OpenBadgeCredential';

/** Normalize a raw `verifiablePresentationRequest` into challenge/domain + a query array. */
export function parseVpr(raw: unknown): ParsedVpr {
	const obj = (raw ?? {}) as Record<string, unknown>;
	const query = obj.query;
	const queries: VprQuery[] = Array.isArray(query)
		? (query as VprQuery[])
		: query && typeof query === 'object'
			? [query as VprQuery]
			: [];
	return {
		challenge: typeof obj.challenge === 'string' ? obj.challenge : undefined,
		domain: typeof obj.domain === 'string' ? obj.domain : undefined,
		queries
	};
}

/** Result of matching a held credential against the VPR's QueryByExample queries. */
export type QueryMatchResult = { matches: true } | { matches: false; reason: string };

/**
 * Lenient QueryByExample match: pass when some `QueryByExample` query asks for a
 * credential whose `example.type` includes `OpenBadgeCredential` and the held
 * credential's `type` includes it too. A VPR with no QueryByExample (e.g.
 * DID-authentication only) does not ask for a credential presentation → no match.
 */
export function matchQueryByExample(queries: VprQuery[], credential: unknown): QueryMatchResult {
	const byExample = queries.filter((q) => q.type === 'QueryByExample');
	if (byExample.length === 0) {
		return {
			matches: false,
			reason:
				'The presentation request asks only for DID authentication, not a credential presentation.'
		};
	}
	const wantsTarget = byExample
		.flatMap(examplesOf)
		.some((example) => typeIncludes(example.type, TARGET_TYPE));
	if (!wantsTarget) {
		return {
			matches: false,
			reason: `The QueryByExample query does not ask for an ${TARGET_TYPE}.`
		};
	}
	const credType = (credential as { type?: unknown } | null)?.type;
	if (!typeIncludes(credType, TARGET_TYPE)) {
		return {
			matches: false,
			reason: 'The seeded credential does not satisfy the QueryByExample query.'
		};
	}
	return { matches: true };
}

/** Whether the VPR includes a DID-authentication query. */
export function hasDidAuthQuery(queries: VprQuery[]): boolean {
	return queries.some((q) => q.type === 'DIDAuthentication');
}

// ── helpers ──────────────────────────────────────────────────────────────────

/** Collect example credential templates from a QueryByExample query. */
function examplesOf(query: VprQuery): Record<string, unknown>[] {
	const out: Record<string, unknown>[] = [];
	const push = (ex: unknown) => {
		if (ex && typeof ex === 'object') out.push(ex as Record<string, unknown>);
	};
	push(query.example);
	const cq = query.credentialQuery;
	if (Array.isArray(cq)) for (const q of cq) push((q as Record<string, unknown> | null)?.example);
	else if (cq && typeof cq === 'object') push((cq as Record<string, unknown>).example);
	return out;
}

/** Whether a credential `type` field (string or array) includes `target`. */
function typeIncludes(value: unknown, target: string): boolean {
	if (typeof value === 'string') return value === target;
	if (Array.isArray(value)) return value.includes(target);
	return false;
}

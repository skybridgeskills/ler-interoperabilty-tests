import { describe, expect, it } from 'vitest';

import { hasDidAuthQuery, matchQueryByExample, parseVpr } from './vpr.js';

const ob3 = { type: ['VerifiableCredential', 'OpenBadgeCredential'] };

function vpr(query: unknown, extra: Record<string, unknown> = {}) {
	return { challenge: 'chal-1', domain: 'https://verifier.test', query, ...extra };
}

describe('parseVpr', () => {
	it('normalizes a single query object to an array', () => {
		const parsed = parseVpr(vpr({ type: 'QueryByExample', example: ob3 }));
		expect(parsed.challenge).toBe('chal-1');
		expect(parsed.domain).toBe('https://verifier.test');
		expect(parsed.queries).toHaveLength(1);
	});

	it('keeps an array of queries', () => {
		const parsed = parseVpr(vpr([{ type: 'QueryByExample' }, { type: 'DIDAuthentication' }]));
		expect(parsed.queries).toHaveLength(2);
	});

	it('tolerates a missing/garbage request', () => {
		expect(parseVpr(undefined).queries).toEqual([]);
		expect(parseVpr({ challenge: 5 }).challenge).toBeUndefined();
	});
});

describe('matchQueryByExample', () => {
	it('matches an OpenBadgeCredential example (direct example)', () => {
		const { queries } = parseVpr(vpr({ type: 'QueryByExample', example: ob3 }));
		expect(matchQueryByExample(queries, ob3)).toEqual({ matches: true });
	});

	it('matches via credentialQuery[].example', () => {
		const { queries } = parseVpr(
			vpr({
				type: 'QueryByExample',
				credentialQuery: [{ example: { type: 'OpenBadgeCredential' } }]
			})
		);
		expect(matchQueryByExample(queries, ob3)).toEqual({ matches: true });
	});

	it('fails a DID-auth-only VPR with a clear message', () => {
		const { queries } = parseVpr(vpr({ type: 'DIDAuthentication' }));
		const result = matchQueryByExample(queries, ob3);
		expect(result.matches).toBe(false);
		expect(result.matches === false && result.reason).toMatch(/only for DID authentication/i);
	});

	it('fails when the example asks for a different credential type', () => {
		const { queries } = parseVpr(
			vpr({ type: 'QueryByExample', example: { type: 'SomeOtherCredential' } })
		);
		expect(matchQueryByExample(queries, ob3).matches).toBe(false);
	});
});

describe('hasDidAuthQuery', () => {
	it('detects a DIDAuthentication query', () => {
		const { queries } = parseVpr(vpr([{ type: 'QueryByExample' }, { type: 'DIDAuthentication' }]));
		expect(hasDidAuthQuery(queries)).toBe(true);
	});

	it('is false when absent', () => {
		const { queries } = parseVpr(vpr({ type: 'QueryByExample', example: ob3 }));
		expect(hasDidAuthQuery(queries)).toBe(false);
	});
});

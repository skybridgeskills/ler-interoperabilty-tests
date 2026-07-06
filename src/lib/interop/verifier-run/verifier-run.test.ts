import { describe, expect, it } from 'vitest';

import {
	PassAttestation,
	PassDefinition,
	PassKind,
	VerifierRunDefinition
} from './verifier-run.js';

function pass(overrides: Partial<PassDefinition> = {}): PassDefinition {
	return PassDefinition({
		passId: 'pass-1',
		label: 'Pass 1',
		kind: 'valid',
		credential: { '@context': [] },
		...overrides
	});
}

describe('PassKind', () => {
	it('accepts the four M1 kinds', () => {
		for (const kind of ['valid', 'broken-signature', 'schema-problem', 'expired'] as const) {
			expect(PassKind(kind)).toBe(kind);
		}
	});

	it('rejects revoked (not yet a generated pass kind)', () => {
		expect(() => PassKind.schema.parse('revoked')).toThrow();
	});
});

describe('PassDefinition', () => {
	it('round-trips a full pass', () => {
		const p = pass();
		expect(PassDefinition.schema.parse(p)).toEqual(p);
	});

	it('rejects an unknown kind', () => {
		expect(() =>
			PassDefinition.schema.parse({
				passId: 'pass-1',
				label: 'Pass 1',
				kind: 'mystery',
				credential: {}
			})
		).toThrow();
	});
});

describe('VerifierRunDefinition', () => {
	it('round-trips a run with ordered passes', () => {
		const run = VerifierRunDefinition({
			runId: 'run-1',
			profile: 'ob3-direct-delivery',
			workflow: 'direct-credential-verification',
			cryptosuite: 'eddsa-rdfc-2022',
			passes: [pass(), pass({ passId: 'pass-2', label: 'Pass 2', kind: 'expired' })]
		});

		expect(VerifierRunDefinition.schema.parse(run)).toEqual(run);
		expect(run.passes.map((p) => p.passId)).toEqual(['pass-1', 'pass-2']);
	});

	it('rejects a pass with a bad kind inside the run', () => {
		expect(() =>
			VerifierRunDefinition.schema.parse({
				runId: 'run-1',
				profile: 'ob3-direct-delivery',
				workflow: 'direct-credential-verification',
				cryptosuite: 'eddsa-rdfc-2022',
				passes: [{ passId: 'pass-1', label: 'Pass 1', kind: 'revoked', credential: {} }]
			})
		).toThrow();
	});
});

describe('PassAttestation', () => {
	it('round-trips accepted without a reason', () => {
		const a = PassAttestation({ passId: 'pass-1', verdict: 'accepted' });
		expect(PassAttestation.schema.parse(a)).toEqual(a);
	});

	it('round-trips rejected with a reason', () => {
		const a = PassAttestation({ passId: 'pass-2', verdict: 'rejected', reason: 'signature' });
		expect(a.reason).toBe('signature');
	});

	it('rejects a missing verdict', () => {
		expect(() => PassAttestation.schema.parse({ passId: 'pass-1' })).toThrow();
	});

	it('rejects an unknown reason', () => {
		expect(() =>
			PassAttestation.schema.parse({ passId: 'pass-1', verdict: 'rejected', reason: 'vibes' })
		).toThrow();
	});
});

import { describe, expect, it } from 'vitest';

import { automaticChecks } from '../automatic-checks.js';
import type { RunEvidence } from '../evidence.js';

/**
 * The wallet presentation family, ported from `wallet-runner`'s black-box
 * scorer.
 *
 * The fixtures mirror `wallet-runner/verify-exchange-context.test.ts`: a
 * self-verifying presentation folded into `variables.results.default`, plus the
 * cases where something is missing. The assertions that matter most are the
 * **resolved `warn`/`n/a` branches** — the engine had three statuses and the
 * scenario model has two, so every branch had to be given an honest home at
 * authoring, and a regression there would silently change what a wallet is told.
 */

const STEP = 'present';

const EDDSA_HOLDER = 'did:key:z6MkStubHolderKeyForEd25519Testing';
const ECDSA_HOLDER = 'did:key:zDnaStubHolderKeyForP256Testing';

type Vp = Record<string, unknown>;

function vp(overrides: Partial<Vp> = {}): Vp {
	return {
		holder: EDDSA_HOLDER,
		verifiableCredential: [
			{ type: ['VerifiableCredential'], proof: { type: 'DataIntegrityProof' } }
		],
		proof: {
			type: 'DataIntegrityProof',
			cryptosuite: 'eddsa-rdfc-2022',
			challenge: 'nonce-1',
			domain: 'redirect_uri:https://verifier.test/response'
		},
		...overrides
	};
}

function evidence(variables: Record<string, unknown>): RunEvidence {
	return { steps: { [STEP]: { stepId: STEP, exchange: { state: 'complete', variables } } } };
}

/** The ordinary happy case: a verified presentation, bound to an OID4VP request. */
function verified(presentation: unknown = vp()): RunEvidence {
	return evidence({
		results: { default: { verified: true, verifiablePresentation: presentation } },
		oid4vp: { responseReceived: true, clientId: 'redirect_uri:https://verifier.test/response' }
	});
}

/** A VCALM exchange: no `oid4vp` state, so no echoed request audience. */
function vcalm(presentation: unknown = vp()): RunEvidence {
	return evidence({
		results: { default: { verified: true, verifiablePresentation: presentation } }
	});
}

const run = (id: string, ev: RunEvidence) =>
	automaticChecks[id].run({ stepId: STEP, evidence: ev });

describe('every wallet presentation check is registered', () => {
	it.each([
		'wallet-vp-delivered',
		'wallet-vp-di-not-jwt',
		'wallet-vp-signature-valid',
		'wallet-vp-proof-binding',
		'wallet-vp-preserves-vc-proofs',
		'wallet-vp-cryptosuite-eddsa',
		'wallet-vp-cryptosuite-ecdsa',
		'wallet-holder-did-method',
		'wallet-holder-key-type-eddsa',
		'wallet-holder-key-type-ecdsa'
	])('%s resolves by id', (id) => {
		expect(automaticChecks[id]?.id).toBe(id);
	});
});

describe('wallet-vp-delivered', () => {
	it('reads `direct_post` arrival on OID4VP', () => {
		expect(run('wallet-vp-delivered', verified()).met).toBe(true);
	});

	it('fails when OID4VP recorded no response', () => {
		const ev = evidence({ results: { default: {} }, oid4vp: { responseReceived: false } });
		expect(run('wallet-vp-delivered', ev).met).toBe(false);
	});

	it('falls back to the echoed presentation on VCALM, which has no `oid4vp` state', () => {
		expect(run('wallet-vp-delivered', vcalm()).met).toBe(true);
	});

	it('fails when nothing arrived — the engine’s `n/a` branch resolves to a fail', () => {
		expect(run('wallet-vp-delivered', evidence({})).met).toBe(false);
	});
});

describe('wallet-vp-di-not-jwt', () => {
	it('passes a Data Integrity presentation', () => {
		expect(run('wallet-vp-di-not-jwt', verified()).met).toBe(true);
	});

	it('fails a compact JWT VP, which arrives as a bare string', () => {
		const result = run('wallet-vp-di-not-jwt', verified('eyJhbGciOi.stub.jwt'));
		expect(result.met).toBe(false);
		expect(result.detail).toContain('compact JWT');
	});

	it('fails a presentation whose proof is some other type', () => {
		expect(
			run('wallet-vp-di-not-jwt', verified(vp({ proof: { type: 'Ed25519Signature2020' } }))).met
		).toBe(false);
	});

	it('fails when nothing arrived', () => {
		expect(run('wallet-vp-di-not-jwt', evidence({})).met).toBe(false);
	});
});

describe('wallet-vp-signature-valid', () => {
	it('trusts verifier-core’s verdict rather than re-verifying', () => {
		expect(run('wallet-vp-signature-valid', verified()).met).toBe(true);
	});

	it('fails when verifier-core did not verify the proof', () => {
		const ev = evidence({
			results: { default: { verified: false, verifiablePresentation: vp() } }
		});
		expect(run('wallet-vp-signature-valid', ev).met).toBe(false);
	});

	it('fails when nothing arrived', () => {
		expect(run('wallet-vp-signature-valid', evidence({})).met).toBe(false);
	});
});

describe('wallet-vp-proof-binding', () => {
	it('passes when the proof domain matches the request audience', () => {
		expect(run('wallet-vp-proof-binding', verified()).met).toBe(true);
	});

	it('fails a proof with no challenge', () => {
		const bare = vp({ proof: { type: 'DataIntegrityProof', domain: 'x' } });
		expect(run('wallet-vp-proof-binding', verified(bare)).met).toBe(false);
	});

	it('fails when the domain is not this request’s audience', () => {
		const wrong = vp({
			proof: { type: 'DataIntegrityProof', challenge: 'nonce-1', domain: 'someone-else' }
		});
		expect(run('wallet-vp-proof-binding', verified(wrong)).met).toBe(false);
	});

	it('fails a challenge-only binding — the engine’s `warn` branch resolves to a fail', () => {
		// A proof bound to the exchange but not to the verifier is replayable
		// elsewhere, which is the thing this row exists to prevent. Both profiles'
		// rows demand challenge AND domain, so a partial binding is a failure.
		const challengeOnly = vp({ proof: { type: 'DataIntegrityProof', challenge: 'nonce-1' } });
		const result = run('wallet-vp-proof-binding', vcalm(challengeOnly));
		expect(result.met).toBe(false);
		expect(result.detail).toContain('not to this verifier');
	});

	it('falls back to the verifier’s own verdict when the exchange echoes no audience', () => {
		expect(run('wallet-vp-proof-binding', vcalm()).met).toBe(true);
	});
});

describe('wallet-vp-preserves-vc-proofs', () => {
	it('passes on presence — the honest black-box signal', () => {
		expect(run('wallet-vp-preserves-vc-proofs', verified()).met).toBe(true);
	});

	it('fails when the embedded credential lost its proof', () => {
		const stripped = vp({ verifiableCredential: [{ type: ['VerifiableCredential'] }] });
		expect(run('wallet-vp-preserves-vc-proofs', verified(stripped)).met).toBe(false);
	});

	it('fails when the presentation embeds no credential at all', () => {
		expect(
			run('wallet-vp-preserves-vc-proofs', verified(vp({ verifiableCredential: [] }))).met
		).toBe(false);
	});
});

describe('the data-integrity-cryptosuites producer checks', () => {
	it('name the suite the presentation was actually signed with', () => {
		expect(run('wallet-vp-cryptosuite-eddsa', verified()).met).toBe(true);
		expect(run('wallet-vp-cryptosuite-ecdsa', verified()).met).toBe(false);
	});

	it('report which suite was seen when it is the other one', () => {
		const result = run('wallet-vp-cryptosuite-ecdsa', verified());
		expect(result.detail).toContain('eddsa-rdfc-2022');
	});

	it('accept did:key and did:web holders, and nothing else', () => {
		expect(run('wallet-holder-did-method', verified()).met).toBe(true);
		expect(
			run('wallet-holder-did-method', verified(vp({ holder: 'did:web:issuer.test' }))).met
		).toBe(true);
		expect(run('wallet-holder-did-method', verified(vp({ holder: 'did:ion:abc' }))).met).toBe(
			false
		);
	});

	it('match the did:key multibase prefix to the suite', () => {
		expect(run('wallet-holder-key-type-eddsa', verified()).met).toBe(true);
		expect(run('wallet-holder-key-type-ecdsa', verified()).met).toBe(false);
		expect(run('wallet-holder-key-type-ecdsa', verified(vp({ holder: ECDSA_HOLDER }))).met).toBe(
			true
		);
	});

	it('pass vacuously for a did:web holder — the rule has nothing to apply to', () => {
		// The distinction the issuer migration drew: a rule with nothing to apply
		// to passes; a rule whose input is missing because something upstream
		// failed fails. A did:web holder encodes no key type in its identifier.
		const result = run(
			'wallet-holder-key-type-eddsa',
			verified(vp({ holder: 'did:web:wallet.test' }))
		);
		expect(result.met).toBe(true);
		expect(result.detail).toContain('no encoded key type');
	});

	it('fail when the presentation never arrived — that is upstream-missing, not vacuous', () => {
		expect(run('wallet-holder-key-type-eddsa', evidence({})).met).toBe(false);
		expect(run('wallet-holder-did-method', evidence({})).met).toBe(false);
		expect(run('wallet-vp-cryptosuite-eddsa', evidence({})).met).toBe(false);
	});
});

describe('the readers never throw on a partial exchange', () => {
	it.each([
		{},
		{ results: 'not-an-object' },
		{ results: {} },
		{ results: { default: null } },
		{ results: { default: { verifiablePresentation: 42 } } }
	])('survives %j', (variables) => {
		for (const id of Object.keys(automaticChecks).filter((k) => k.startsWith('wallet-'))) {
			expect(() => run(id, evidence(variables as Record<string, unknown>))).not.toThrow();
		}
	});
});

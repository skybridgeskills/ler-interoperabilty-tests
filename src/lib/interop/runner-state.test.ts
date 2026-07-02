import { describe, expect, it } from 'vitest';

import { deriveRunStateFromExchange } from './runner-state.js';

describe('deriveRunStateFromExchange', () => {
	it('null exchange → idle, all steps pending', () => {
		expect(deriveRunStateFromExchange(null, 5)).toEqual({
			run: 'idle',
			perStep: ['pending', 'pending', 'pending', 'pending', 'pending']
		});
	});

	it('pending → awaiting-wallet, step 1 in-flight', () => {
		const r = deriveRunStateFromExchange({ state: 'pending' }, 5);
		expect(r.run).toBe('awaiting-wallet');
		expect(r.perStep[0]).toBe('in-flight');
		expect(r.perStep.slice(1)).toEqual(['pending', 'pending', 'pending', 'pending']);
	});

	it('active without holderDid → wallet-connected, mid steps in-flight', () => {
		const r = deriveRunStateFromExchange({ state: 'active' }, 5);
		expect(r.run).toBe('wallet-connected');
		expect(r.perStep[0]).toBe('complete');
		expect(r.perStep[1]).toBe('complete');
		expect(r.perStep[2]).toBe('in-flight');
		expect(r.perStep[3]).toBe('pending');
	});

	it('active + holderDid → later step in-flight', () => {
		const r = deriveRunStateFromExchange(
			{ state: 'active', variables: { holderDid: 'did:key:z123' } },
			5
		);
		expect(r.run).toBe('wallet-connected');
		expect(r.perStep[3]).toBe('in-flight');
		expect(r.perStep[4]).toBe('pending');
	});

	it('complete → complete, every step complete', () => {
		const r = deriveRunStateFromExchange({ state: 'complete' }, 4);
		expect(r.run).toBe('complete');
		expect(r.perStep).toEqual(['complete', 'complete', 'complete', 'complete']);
	});

	it('invalid → error, every step skipped', () => {
		const r = deriveRunStateFromExchange({ state: 'invalid' }, 3);
		expect(r.run).toBe('error');
		expect(r.perStep).toEqual(['skipped', 'skipped', 'skipped']);
	});

	it('clamps inFlightIndex when stepCount is small', () => {
		const r = deriveRunStateFromExchange(
			{ state: 'active', variables: { holderDid: 'did:key:z' } },
			2
		);
		expect(r.perStep).toEqual(['complete', 'in-flight']);
	});

	describe('OID4VCI (variables.oid4vci present)', () => {
		it('empty oid4vci object → awaiting-wallet, step 1 in-flight', () => {
			const r = deriveRunStateFromExchange({ state: 'pending', variables: { oid4vci: {} } }, 4);
			expect(r.run).toBe('awaiting-wallet');
			expect(r.perStep).toEqual(['in-flight', 'pending', 'pending', 'pending']);
		});

		it('preAuthorizedCode only → wallet-connected, step 2 in-flight', () => {
			const r = deriveRunStateFromExchange(
				{ state: 'pending', variables: { oid4vci: { preAuthorizedCode: 'fake-preauth' } } },
				4
			);
			expect(r.run).toBe('wallet-connected');
			expect(r.perStep).toEqual(['complete', 'in-flight', 'pending', 'pending']);
		});

		it('accessToken (token redeemed) → wallet-connected, step 3 in-flight', () => {
			const r = deriveRunStateFromExchange(
				{
					state: 'pending',
					variables: {
						oid4vci: {
							preAuthorizedCode: 'fake-preauth',
							codeUsed: true,
							accessToken: 'fake-access'
						}
					}
				},
				4
			);
			expect(r.run).toBe('wallet-connected');
			expect(r.perStep).toEqual(['complete', 'complete', 'in-flight', 'pending']);
		});

		it('cNonce present (requesting credential) → step 3 in-flight', () => {
			const r = deriveRunStateFromExchange(
				{ state: 'pending', variables: { oid4vci: { accessToken: 'a', cNonce: 'fake-cnonce' } } },
				4
			);
			expect(r.run).toBe('wallet-connected');
			expect(r.perStep).toEqual(['complete', 'complete', 'in-flight', 'pending']);
		});

		it('complete with an oid4vci object → all complete', () => {
			const r = deriveRunStateFromExchange(
				{
					state: 'complete',
					variables: { oid4vci: { accessToken: 'a', cNonce: 'n', nonceUsed: true } }
				},
				4
			);
			expect(r.run).toBe('complete');
			expect(r.perStep).toEqual(['complete', 'complete', 'complete', 'complete']);
		});

		it('invalid with an oid4vci object → all skipped', () => {
			const r = deriveRunStateFromExchange(
				{ state: 'invalid', variables: { oid4vci: { preAuthorizedCode: 'p' } } },
				4
			);
			expect(r.run).toBe('error');
			expect(r.perStep).toEqual(['skipped', 'skipped', 'skipped', 'skipped']);
		});
	});
});

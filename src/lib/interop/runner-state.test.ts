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
});

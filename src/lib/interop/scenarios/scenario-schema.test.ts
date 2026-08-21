import { describe, expect, it } from 'vitest';

import { ScenarioAction } from './scenario-schema.js';

describe('ScenarioAction — receive-from-issuer', () => {
	it('parses each transport', () => {
		for (const transport of ['direct', 'vcalm', 'oid4vci'] as const) {
			expect(ScenarioAction({ kind: 'receive-from-issuer', transport })).toEqual({
				kind: 'receive-from-issuer',
				transport
			});
		}
	});

	it('carries an optional suite-side key-proof cryptosuite', () => {
		const action = ScenarioAction({
			kind: 'receive-from-issuer',
			transport: 'vcalm',
			keyProofSuite: 'ecdsa-rdfc-2019'
		});
		expect(action).toMatchObject({ keyProofSuite: 'ecdsa-rdfc-2019' });
	});

	it('rejects an unknown transport', () => {
		expect(
			ScenarioAction.schema.safeParse({ kind: 'receive-from-issuer', transport: 'oid4vp' }).success
		).toBe(false);
	});

	it('rejects an unknown key-proof suite', () => {
		expect(
			ScenarioAction.schema.safeParse({
				kind: 'receive-from-issuer',
				transport: 'vcalm',
				keyProofSuite: 'bbs-2023'
			}).success
		).toBe(false);
	});

	it('takes no credential recipe — the credential comes from the operator', () => {
		const parsed = ScenarioAction({
			kind: 'receive-from-issuer',
			transport: 'direct',
			// @ts-expect-error — asserting the field is not part of the action shape.
			credential: 'minimal-ob3'
		});
		expect(parsed).not.toHaveProperty('credential');
	});

	it('takes no issuing intent — the suite mints nothing in an issuer scenario', () => {
		const parsed = ScenarioAction({
			kind: 'receive-from-issuer',
			transport: 'oid4vci',
			// @ts-expect-error — pinning is M12's, and belongs to the actions where the suite mints.
			intent: { cryptosuite: 'eddsa-rdfc-2022', didMethod: 'did:key' }
		});
		expect(parsed).not.toHaveProperty('intent');
	});
});

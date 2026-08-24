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
			// @ts-expect-error — pinning landed in M12, on the actions where the suite mints.
			intent: { cryptosuite: 'eddsa-rdfc-2022', didMethod: 'did:key' }
		});
		expect(parsed).not.toHaveProperty('intent');
	});
});

describe('ScenarioAction — request-presentation', () => {
	it('parses with the request alone', () => {
		expect(ScenarioAction({ kind: 'request-presentation', request: 'ob3-any' })).toEqual({
			kind: 'request-presentation',
			request: 'ob3-any'
		});
	});

	it('parses with some of the conduct fields', () => {
		expect(
			ScenarioAction({
				kind: 'request-presentation',
				request: 'ob3-any',
				queryLanguage: 'pex'
			})
		).toMatchObject({ queryLanguage: 'pex' });
	});

	it('parses with all three conduct fields', () => {
		expect(
			ScenarioAction({
				kind: 'request-presentation',
				request: 'ob3-any',
				queryLanguage: 'pex',
				limitDisclosure: 'required',
				advertiseCryptosuites: ['ecdsa-sd-2023', 'bbs-2023']
			})
		).toMatchObject({
			queryLanguage: 'pex',
			limitDisclosure: 'required',
			advertiseCryptosuites: ['ecdsa-sd-2023', 'bbs-2023']
		});
	});

	it('rejects an unknown query language', () => {
		expect(
			ScenarioAction.schema.safeParse({
				kind: 'request-presentation',
				request: 'ob3-any',
				queryLanguage: 'sparql'
			}).success
		).toBe(false);
	});

	it('rejects an unknown limitDisclosure value', () => {
		expect(
			ScenarioAction.schema.safeParse({
				kind: 'request-presentation',
				request: 'ob3-any',
				limitDisclosure: 'optional'
			}).success
		).toBe(false);
	});

	it('takes advertiseCryptosuites as open strings — the bait names a suite we cannot verify', () => {
		expect(
			ScenarioAction({
				kind: 'request-presentation',
				request: 'ob3-any',
				advertiseCryptosuites: ['a-suite-nobody-implements']
			})
		).toMatchObject({ advertiseCryptosuites: ['a-suite-nobody-implements'] });
	});
});

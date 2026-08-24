import { describe, expect, it } from 'vitest';

import type { IssuerFlowRunResult, VcalmIssuerFlow } from '../wallet-client/index.js';

import { receiveFromVcalmIssuer } from './receive-from-vcalm-issuer.js';
import { ReceiveInputError } from './receive-input-error.js';

const CREDENTIAL = {
	type: ['VerifiableCredential', 'OpenBadgeCredential'],
	credentialSubject: { id: 'did:key:zHolder' }
};

/** A driver that returns whatever observations a case needs, without a network. */
function flowReturning(result: IssuerFlowRunResult): VcalmIssuerFlow {
	return { runIssuerFlow: async () => result };
}

const happyPath: IssuerFlowRunResult = {
	blocked: false,
	observations: {
		interaction: {
			ok: true,
			status: 200,
			protocols: { vcapi: 'https://issuer.test/exchanges/1' },
			vcapiUrl: 'https://issuer.test/exchanges/1',
			tls: { ok: true, atLeastTls12: true, protocol: 'TLSv1.3' },
			rawBody: {}
		},
		didAuth: {
			status: 200,
			challenge: 'chal-1',
			vpr: { challenge: 'chal-1', query: { type: 'DIDAuthentication' } }
		},
		delivery: { status: 200, credential: CREDENTIAL, holderDid: 'did:key:zHolder' },
		verify: { verified: true },
		holder: { did: 'did:key:zHolder', cryptosuite: 'eddsa-rdfc-2022' }
	}
};

async function receive(result: IssuerFlowRunResult, input = 'https://issuer.test/interactions/1') {
	return receiveFromVcalmIssuer({
		input,
		keyProofSuite: 'eddsa-rdfc-2022',
		flow: flowReturning(result)
	});
}

describe('receiveFromVcalmIssuer', () => {
	it('projects a clean run into the summary the vcalm checks read', async () => {
		const result = await receive(happyPath);
		expect(result.delivered).toBe(true);
		expect(result.credential).toEqual(CREDENTIAL);
		expect(result.flow).toEqual({
			transport: 'vcalm',
			verified: true,
			interactionFetched: true,
			participationOk: true,
			vcapiAdvertised: true,
			didAuthRequested: true,
			interactionTls: { atLeastTls12: true, protocol: 'TLSv1.3' },
			holderDid: 'did:key:zHolder',
			subjectId: 'did:key:zHolder'
		});
	});

	it('scores an unreachable interaction URL — delivered:false, never a throw', async () => {
		const result = await receive({
			blocked: true,
			stoppedAtStep: 1,
			observations: {
				interaction: { ok: false, status: 502, rawBody: null, error: 'Bad gateway.' }
			}
		});
		expect(result.delivered).toBe(false);
		expect(result.error?.message).toMatch(/could not reach your interaction URL: Bad gateway\./);
		expect(result.flow).toMatchObject({ interactionFetched: false, participationOk: false });
	});

	it('scores a missing `vcapi` entry, and names it', async () => {
		const result = await receive({
			blocked: true,
			stoppedAtStep: 1,
			observations: {
				interaction: {
					ok: true,
					status: 200,
					protocols: {},
					tls: { ok: true, atLeastTls12: true, protocol: 'TLSv1.3' },
					rawBody: {}
				}
			}
		});
		expect(result.delivered).toBe(false);
		expect(result.flow).toMatchObject({ vcapiAdvertised: false, interactionFetched: true });
		expect(result.error?.message).toMatch(/vcapi/);
	});

	it('scores a missing DIDAuthentication challenge', async () => {
		const result = await receive({
			blocked: true,
			stoppedAtStep: 2,
			observations: {
				...happyPath.observations,
				didAuth: { status: 200, error: 'No DIDAuthentication challenge was returned.' },
				delivery: undefined,
				verify: undefined
			}
		});
		expect(result.delivered).toBe(false);
		expect(result.flow).toMatchObject({ didAuthRequested: false });
		expect(result.error?.message).toMatch(/challenge/i);
	});

	it('flags a challenge with no explicit DIDAuthentication query in the VPR', async () => {
		const result = await receive({
			...happyPath,
			observations: {
				...happyPath.observations,
				didAuth: { status: 200, challenge: 'chal-1', vpr: { challenge: 'chal-1' } }
			}
		});
		expect(result.flow).toMatchObject({ didAuthRequested: true, didAuthQueryMissing: true });
	});

	it('reads a DIDAuthentication query in a VPR array form', async () => {
		const result = await receive({
			...happyPath,
			observations: {
				...happyPath.observations,
				didAuth: {
					status: 200,
					challenge: 'chal-1',
					vpr: { query: [{ type: 'QueryByExample' }, { type: 'DIDAuthentication' }] }
				}
			}
		});
		expect(result.flow).not.toHaveProperty('didAuthQueryMissing');
	});

	it('scores a refused delivery', async () => {
		const result = await receive({
			blocked: true,
			stoppedAtStep: 3,
			observations: {
				...happyPath.observations,
				delivery: { status: 403, error: 'The exchange refused the presentation.' },
				verify: undefined
			}
		});
		expect(result.delivered).toBe(false);
		expect(result.error?.message).toBe('The exchange refused the presentation.');
	});

	it('records a credential that did not verify — delivered, with the reasons', async () => {
		const result = await receive({
			...happyPath,
			observations: {
				...happyPath.observations,
				verify: { verified: false, errors: ['signature invalid'] }
			}
		});
		expect(result.delivered).toBe(true);
		expect(result.flow).toMatchObject({ verified: false, verifyErrors: ['signature invalid'] });
	});

	it('always writes a TLS summary — an unprobed host is a fail, never an absence', async () => {
		const result = await receive({
			blocked: true,
			stoppedAtStep: 1,
			observations: { interaction: { ok: false, status: 0, rawBody: null, error: 'DNS failure.' } }
		});
		expect(result.flow.transport).toBe('vcalm');
		if (result.flow.transport === 'vcalm') {
			expect(result.flow.interactionTls.atLeastTls12).toBe(false);
			expect(result.flow.interactionTls.error).toBeTruthy();
		}
	});

	it('reads `credentialSubject.id` through the array form', async () => {
		const result = await receive({
			...happyPath,
			observations: {
				...happyPath.observations,
				delivery: {
					status: 200,
					credential: { credentialSubject: [{ id: 'did:key:zOther' }] },
					holderDid: 'did:key:zHolder'
				}
			}
		});
		expect(result.flow).toMatchObject({ subjectId: 'did:key:zOther' });
	});

	it('throws ReceiveInputError on a blank, non-URL or non-http input', async () => {
		for (const input of ['   ', 'not a url', 'ftp://issuer.test/x']) {
			await expect(receive(happyPath, input)).rejects.toBeInstanceOf(ReceiveInputError);
		}
	});

	it('carries no server object, key or token into the summary', async () => {
		const result = await receive(happyPath);
		const serialised = JSON.stringify(result.flow);
		expect(serialised).not.toMatch(/token|secret|privateKey|Buffer/i);
		expect(JSON.parse(serialised)).toEqual(result.flow);
	});
});

describe('receiveFromVcalmIssuer — the display trace', () => {
	it('synthesises three stages in flow order from the driver’s facts', async () => {
		const result = await receive(happyPath);
		expect(result.trace?.stages.map((s) => s.name)).toEqual(['interaction', 'didauth', 'delivery']);
		expect(result.trace?.stages[0]).toMatchObject({
			label: 'Interaction URL',
			method: 'GET',
			url: 'https://issuer.test/interactions/1',
			status: 200,
			ok: true,
			body: { vcapi: 'https://issuer.test/exchanges/1' }
		});
		// The VPR is the artifact worth reading on the DIDAuth leg.
		expect(result.trace?.stages[1].body).toMatchObject({
			query: { type: 'DIDAuthentication' }
		});
		expect(result.trace?.stages[2]).toMatchObject({
			label: 'Credential delivery',
			method: 'POST',
			url: 'https://issuer.test/exchanges/1',
			ok: true
		});
	});

	it('keeps only the legs the flow reached', async () => {
		const result = await receive({
			blocked: true,
			observations: {
				interaction: {
					ok: false,
					status: 0,
					rawBody: undefined,
					error: 'fetch failed'
				}
			}
		});
		expect(result.trace?.stages).toHaveLength(1);
		expect(result.trace?.stages[0]).toMatchObject({
			name: 'interaction',
			ok: false,
			error: 'fetch failed'
		});
	});

	it('marks the delivery leg failed when the exchange answered but delivered nothing', async () => {
		const result = await receive({
			blocked: true,
			observations: {
				...happyPath.observations,
				delivery: { status: 500, error: 'The exchange responded 500.' },
				verify: undefined
			}
		});
		expect(result.delivered).toBe(false);
		expect(result.trace?.stages.at(-1)).toMatchObject({
			name: 'delivery',
			status: 500,
			ok: false,
			error: 'The exchange responded 500.'
		});
	});

	it('never carries the delivered credential — that rides the artifact slot', async () => {
		const result = await receive(happyPath);
		expect(result.credential).toEqual(CREDENTIAL);
		expect(JSON.stringify(result.trace)).not.toContain('OpenBadgeCredential');
	});
});

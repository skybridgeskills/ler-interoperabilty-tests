import { describe, expect, it } from 'vitest';

import type { Oid4IssuerFlow, Oid4IssuerFlowRunResult } from '../wallet-client/index.js';

import { receiveFromOid4Issuer } from './receive-from-oid4-issuer.js';
import { ReceiveInputError } from './receive-input-error.js';

const CREDENTIAL = {
	type: ['VerifiableCredential', 'OpenBadgeCredential'],
	credentialSubject: { id: 'did:key:zHolder' }
};

function flowReturning(result: Oid4IssuerFlowRunResult): Oid4IssuerFlow {
	return { runIssuerFlow: async () => result };
}

const happyPath: Oid4IssuerFlowRunResult = {
	blocked: false,
	observations: {
		offerUrl: 'openid-credential-offer://?credential_offer=%7B%7D',
		tls: { ok: true, atLeastTls12: true, protocol: 'TLSv1.3' },
		offer: {
			credentialIssuer: 'https://issuer.test',
			preAuthCode: 'code-1',
			configurationId: 'ob3'
		},
		issuerMeta: {
			credentialEndpoint: 'https://issuer.test/credential',
			proofTypesSupported: { di_vp: {} },
			diVpSigningAlgs: ['eddsa-rdfc-2022']
		},
		token: { redeemed: true, cNonce: 'nonce-1' },
		delivery: { status: 200, credential: CREDENTIAL, holderDid: 'did:key:zHolder' },
		verify: { verified: true },
		holder: { did: 'did:key:zHolder', cryptosuite: 'eddsa-rdfc-2022' },
		transcript: []
	}
};

async function receive(
	result: Oid4IssuerFlowRunResult,
	input = 'openid-credential-offer://?credential_offer=%7B%7D'
) {
	return receiveFromOid4Issuer({
		input,
		keyProofSuite: 'eddsa-rdfc-2022',
		flow: flowReturning(result)
	});
}

describe('receiveFromOid4Issuer', () => {
	it('projects a clean run into the summary the oid4 checks read', async () => {
		const result = await receive(happyPath);
		expect(result.delivered).toBe(true);
		expect(result.credential).toEqual(CREDENTIAL);
		expect(result.flow).toEqual({
			transport: 'oid4vci',
			verified: true,
			metadataReachable: true,
			diVpOffered: true,
			proofTypesOffered: ['di_vp'],
			diVpSigningAlgs: ['eddsa-rdfc-2022'],
			diVpSigningAlgInBundle: true,
			preAuthCodeRedeemed: true,
			credentialDelivered: true,
			credentialStatus: 200,
			issuerTls: { atLeastTls12: true, protocol: 'TLSv1.3' },
			holderDid: 'did:key:zHolder',
			subjectId: 'did:key:zHolder'
		});
	});

	it('scores unreachable issuer metadata', async () => {
		const result = await receive({
			blocked: true,
			stoppedAtStep: 1,
			observations: {
				...happyPath.observations,
				issuerMeta: undefined,
				token: undefined,
				delivery: undefined,
				verify: undefined,
				transcript: [
					{
						name: 'issuer-metadata',
						method: 'GET',
						url: 'https://issuer.test/.well-known/openid-credential-issuer',
						ok: false,
						status: 404,
						responseBody: null,
						error: 'issuer-metadata request responded 404.'
					}
				]
			}
		});
		expect(result.delivered).toBe(false);
		expect(result.flow).toMatchObject({ metadataReachable: false, diVpOffered: false });
		expect(result.error?.message).toMatch(/404/);
	});

	it('reports a JWT-only key-proof offering', async () => {
		const result = await receive({
			...happyPath,
			observations: {
				...happyPath.observations,
				issuerMeta: {
					credentialEndpoint: 'https://issuer.test/credential',
					proofTypesSupported: { jwt: {} }
				}
			}
		});
		expect(result.flow).toMatchObject({
			diVpOffered: false,
			proofTypesOffered: ['jwt'],
			diVpSigningAlgs: [],
			diVpSigningAlgInBundle: false
		});
	});

	it('reports `di_vp` advertised with no bundle signing algorithm', async () => {
		const result = await receive({
			...happyPath,
			observations: {
				...happyPath.observations,
				issuerMeta: {
					credentialEndpoint: 'https://issuer.test/credential',
					proofTypesSupported: { di_vp: {} },
					diVpSigningAlgs: ['bbs-2023']
				}
			}
		});
		expect(result.flow).toMatchObject({
			diVpOffered: true,
			diVpSigningAlgs: ['bbs-2023'],
			diVpSigningAlgInBundle: false
		});
	});

	it('scores a refused pre-authorized code', async () => {
		const result = await receive({
			blocked: true,
			stoppedAtStep: 2,
			observations: {
				...happyPath.observations,
				token: { redeemed: false },
				delivery: undefined,
				verify: undefined,
				transcript: [
					{
						name: 'token',
						method: 'POST',
						url: 'https://issuer.test/token',
						ok: false,
						status: 400,
						responseBody: { error: 'invalid_grant' },
						error: 'token request responded 400.'
					}
				]
			}
		});
		expect(result.delivered).toBe(false);
		expect(result.flow).toMatchObject({ preAuthCodeRedeemed: false });
		expect(result.error?.message).toMatch(/400/);
	});

	it('scores a credential endpoint that refused, keeping its status', async () => {
		const result = await receive({
			blocked: true,
			stoppedAtStep: 3,
			observations: {
				...happyPath.observations,
				delivery: { status: 401, error: 'The credential endpoint rejected our key proof.' },
				verify: undefined
			}
		});
		expect(result.delivered).toBe(false);
		expect(result.flow).toMatchObject({ credentialDelivered: false, credentialStatus: 401 });
		expect(result.error?.message).toMatch(/key proof/);
	});

	it('records a credential that did not verify — delivered, with the reasons', async () => {
		const result = await receive({
			...happyPath,
			observations: {
				...happyPath.observations,
				verify: { verified: false, errors: ['issuer DID did not resolve'] }
			}
		});
		expect(result.delivered).toBe(true);
		expect(result.flow).toMatchObject({
			verified: false,
			verifyErrors: ['issuer DID did not resolve']
		});
	});

	it('always writes a TLS summary — an unprobed issuer is a fail, never an absence', async () => {
		const result = await receive({
			blocked: true,
			stoppedAtStep: 1,
			observations: { offer: undefined, transcript: [] }
		});
		expect(result.flow.transport).toBe('oid4vci');
		if (result.flow.transport === 'oid4vci') {
			expect(result.flow.issuerTls.atLeastTls12).toBe(false);
			expect(result.flow.issuerTls.error).toBeTruthy();
		}
	});

	it('throws ReceiveInputError on a blank input', async () => {
		await expect(receive(happyPath, '   ')).rejects.toBeInstanceOf(ReceiveInputError);
	});

	it('carries no access token into the summary', async () => {
		const result = await receive({
			...happyPath,
			observations: {
				...happyPath.observations,
				token: { redeemed: true, cNonce: 'nonce-1' }
			}
		});
		const serialised = JSON.stringify(result.flow);
		expect(serialised).not.toMatch(/access_token|accessToken|Bearer/i);
		expect(JSON.parse(serialised)).toEqual(result.flow);
	});
});

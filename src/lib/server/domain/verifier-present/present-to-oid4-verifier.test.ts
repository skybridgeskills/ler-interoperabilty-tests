import { describe, expect, it } from 'vitest';

import type { SubmitResponse } from '../wallet-client/drivers/oid4vp-presentation.js';
import type { TlsProbeResult } from '../wallet-client/index.js';
import type { WalletCrypto } from '../wallet-crypto/index.js';

import { PresentInputError } from './present-input-error.js';
import { presentToOid4Verifier, type SubmitFactory } from './present-to-oid4-verifier.js';

/** No crypto: fake keys, echo the credential, canned VP that self-verifies. Never touches the network. */
const fakeCrypto = {
	generateKey: async (cryptosuite: string) => ({
		did: 'did:key:zFake',
		verificationMethod: 'did:key:zFake#0',
		cryptosuite
	}),
	issueCredential: async ({ credential }: { credential: Record<string, unknown> }) => ({
		...credential,
		proof: { type: 'DataIntegrityProof', proofValue: `z${'A'.repeat(80)}2` }
	}),
	signPresentation: async () => ({ type: ['VerifiablePresentation'], holder: 'did:key:zFake' }),
	verifyPresentation: async () => ({ verified: true, errors: [] })
} as unknown as WalletCrypto;

const okTls: TlsProbeResult = { ok: true, protocol: 'TLSv1.3', atLeastTls12: true };
const okProbe = async (): Promise<TlsProbeResult> => okTls;

const OB3_PD = {
	id: 'pd-1',
	format: { ldp_vp: {} },
	input_descriptors: [
		{
			id: 'ob3',
			constraints: {
				fields: [{ path: ['$.type'], filter: { contains: { const: 'OpenBadgeCredential' } } }]
			}
		}
	]
};

function validRequest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		client_id: 'https://v.test',
		response_uri: 'https://v.test/direct-post',
		response_mode: 'direct_post',
		nonce: 'n-1',
		presentation_definition: OB3_PD,
		...overrides
	};
}

/** A recipe doc the suite signs and presents (type OpenBadgeCredential so it matches OB3_PD). */
function recipeDoc(): Record<string, unknown> {
	return {
		'@context': ['https://www.w3.org/ns/credentials/v2'],
		type: ['VerifiableCredential', 'OpenBadgeCredential'],
		issuer: { id: 'did:key:placeholder' },
		credentialSubject: { id: '{{HOLDER_DID}}', type: 'AchievementSubject' }
	};
}

/** Serve one JSON body for any by-reference fetch. */
function fetchJson(body: unknown): typeof fetch {
	return (async () =>
		new Response(JSON.stringify(body), {
			status: 200,
			headers: { 'content-type': 'application/json' }
		})) as typeof fetch;
}

/** A submit factory that lands (calls onStatus, resolves) or throws (a rejected submission). */
function submitFactory(mode: 'ok' | 'reject'): SubmitFactory {
	return (onStatus) => {
		const submit: SubmitResponse = async () => {
			if (mode === 'reject') {
				onStatus(422);
				throw new Error('Verifier responded 422.');
			}
			onStatus(200);
			return { verified: true };
		};
		return submit;
	};
}

const base = {
	doc: recipeDoc(),
	cryptosuite: 'eddsa-rdfc-2022' as const,
	crypto: fakeCrypto,
	probe: okProbe
};

describe('presentToOid4Verifier', () => {
	it('inspects a healthy by-reference request and lands the submission', async () => {
		const { request, present } = await presentToOid4Verifier({
			...base,
			doc: recipeDoc(),
			input: 'https://v.test/request/1',
			fetchImpl: fetchJson(validRequest()),
			submitFactory: submitFactory('ok')
		});

		expect(request).toMatchObject({
			transport: 'oid4vp',
			requestForm: 'by-reference',
			requestResolved: true,
			matchable: true,
			diVpFormat: 'di'
		});
		expect(request.requestTls.atLeastTls12).toBe(true);
		expect(request.responseTls.atLeastTls12).toBe(true);
		expect(present).toEqual({ submitted: true, transportStatus: 200 });
	});

	it('marks an inline request and reads its request TLS as met (no endpoint to probe)', async () => {
		const { request } = await presentToOid4Verifier({
			...base,
			doc: recipeDoc(),
			input: JSON.stringify(validRequest()),
			fetchImpl: fetchJson(validRequest()),
			submitFactory: submitFactory('ok')
		});

		expect(request.requestForm).toBe('inline');
		expect(request.requestTls.atLeastTls12).toBe(true);
	});

	it('reports a JWT-only request as diVpFormat jwt-only', async () => {
		const { request } = await presentToOid4Verifier({
			...base,
			doc: recipeDoc(),
			input: JSON.stringify(
				validRequest({
					presentation_definition: { ...OB3_PD, format: { jwt_vp: {} } }
				})
			),
			fetchImpl: fetchJson(validRequest()),
			submitFactory: submitFactory('ok')
		});

		expect(request.diVpFormat).toBe('jwt-only');
	});

	it('reads an unpinned request (no format) as diVpFormat unpinned', async () => {
		const { request } = await presentToOid4Verifier({
			...base,
			doc: recipeDoc(),
			input: JSON.stringify(
				validRequest({
					presentation_definition: {
						id: 'pd-1',
						input_descriptors: [{ id: 'ob3', constraints: { fields: [] } }]
					}
				})
			),
			fetchImpl: fetchJson(validRequest()),
			submitFactory: submitFactory('ok')
		});

		expect(request.diVpFormat).toBe('unpinned');
	});

	it('scores an unresolvable request (bad shape) as requestResolved:false and skips the present', async () => {
		const { request, present } = await presentToOid4Verifier({
			...base,
			doc: recipeDoc(),
			input: JSON.stringify({ not: 'an oid4vp request' }),
			fetchImpl: fetchJson({ not: 'used' }),
			submitFactory: submitFactory('ok')
		});

		expect(request.requestResolved).toBe(false);
		expect(request.matchable).toBe(false);
		expect(present.submitted).toBe(false);
	});

	it('scores a failed by-reference fetch as requestResolved:false, not a throw', async () => {
		const failingFetch = (async () => {
			throw new Error('network down');
		}) as typeof fetch;
		const { request, present } = await presentToOid4Verifier({
			...base,
			doc: recipeDoc(),
			input: 'https://v.test/request/1',
			fetchImpl: failingFetch,
			submitFactory: submitFactory('ok')
		});

		expect(request.requestResolved).toBe(false);
		expect(present.submitted).toBe(false);
	});

	it('reports a rejected submission as submitted:false, not a throw', async () => {
		const { present } = await presentToOid4Verifier({
			...base,
			doc: recipeDoc(),
			input: JSON.stringify(validRequest()),
			fetchImpl: fetchJson(validRequest()),
			submitFactory: submitFactory('reject')
		});

		expect(present.submitted).toBe(false);
		expect(present.error?.message).toMatch(/422/);
	});

	it('throws PresentInputError for a blank / non-link / non-JSON input', async () => {
		for (const input of ['   ', 'not a url and not json']) {
			await expect(
				presentToOid4Verifier({
					...base,
					doc: recipeDoc(),
					input,
					fetchImpl: fetchJson(validRequest()),
					submitFactory: submitFactory('ok')
				})
			).rejects.toBeInstanceOf(PresentInputError);
		}
	});
});

describe('presentToOid4Verifier — the display trace', () => {
	it('carries two stages: what we made of the request, and where the token went', async () => {
		const { trace } = await presentToOid4Verifier({
			...base,
			doc: recipeDoc(),
			input: 'https://v.test/request/1',
			fetchImpl: fetchJson(validRequest()),
			submitFactory: submitFactory('ok')
		});

		expect(trace?.stages.map((s) => s.name)).toEqual(['request', 'submission']);
		expect(trace?.stages[0]).toMatchObject({
			label: 'Authorization request',
			method: 'GET',
			url: 'https://v.test/request/1',
			ok: true
		});
		// The presentation_definition is what an operator debugging a non-match reads.
		expect(trace?.stages[0].body).toMatchObject({ presentation_definition: { id: 'pd-1' } });
		expect(trace?.stages[1]).toMatchObject({
			label: 'Presentation submission',
			method: 'POST',
			url: 'https://v.test/direct-post',
			status: 200,
			ok: true
		});
	});

	it('omits the request URL for an inline paste — there was no endpoint', async () => {
		const { trace } = await presentToOid4Verifier({
			...base,
			doc: recipeDoc(),
			input: JSON.stringify(validRequest()),
			fetchImpl: fetchJson(validRequest()),
			submitFactory: submitFactory('ok')
		});

		expect(trace?.stages[0].url).toBeUndefined();
		expect(trace?.stages[0].method).toBeUndefined();
		expect(trace?.stages[0].ok).toBe(true);
	});

	it('records a rejected submission with its status and reason', async () => {
		const { present, trace } = await presentToOid4Verifier({
			...base,
			doc: recipeDoc(),
			input: 'https://v.test/request/1',
			fetchImpl: fetchJson(validRequest()),
			submitFactory: submitFactory('reject')
		});

		expect(present.submitted).toBe(false);
		expect(trace?.stages.at(-1)).toMatchObject({
			name: 'submission',
			status: 422,
			ok: false
		});
		expect(trace?.stages.at(-1)?.error).toMatch(/422/);
	});

	it('gives an unresolved paste one failing stage and no submission stage', async () => {
		const { trace } = await presentToOid4Verifier({
			...base,
			doc: recipeDoc(),
			input: 'https://v.test/request/1',
			fetchImpl: fetchJson({ not: 'an authorization request' }),
			submitFactory: submitFactory('ok')
		});

		expect(trace?.stages).toHaveLength(1);
		expect(trace?.stages[0]).toMatchObject({ name: 'request', ok: false });
		expect(trace?.stages[0].error).toMatch(/OID4VP/);
	});

	it('leaks neither the signed presentation nor the held credential', async () => {
		const { trace } = await presentToOid4Verifier({
			...base,
			doc: recipeDoc(),
			input: 'https://v.test/request/1',
			fetchImpl: fetchJson(validRequest()),
			submitFactory: submitFactory('ok')
		});

		// `OpenBadgeCredential` DOES appear — inside the verifier's own
		// `presentation_definition` filter, which is exactly what an operator
		// debugging a non-match needs to read. What must not appear is anything the
		// suite signed: the VP, the holder's proof, or the credential we presented.
		const serialised = JSON.stringify(trace);
		expect(serialised).not.toContain('VerifiablePresentation');
		expect(serialised).not.toContain('proofValue');
		expect(serialised).not.toContain('did:key:zFake');
		expect(serialised).not.toContain('credentialSubject');
	});
});

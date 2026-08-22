import { describe, expect, it } from 'vitest';

import type {
	ExchangeFlowTransport,
	FetchInteractionResult,
	PostToVcapiResult,
	TlsProbeResult
} from '../wallet-client/index.js';
import type { WalletCrypto } from '../wallet-crypto/index.js';

import { PresentInputError } from './present-input-error.js';
import { presentToVcalmVerifier } from './present-to-vcalm-verifier.js';

/** A minimal recipe doc — enough for the binding + QueryByExample match. */
function recipeDoc(): Record<string, unknown> {
	return {
		'@context': ['https://www.w3.org/ns/credentials/v2'],
		type: ['VerifiableCredential', 'OpenBadgeCredential'],
		issuer: { id: 'did:key:placeholder' },
		credentialSubject: { id: '{{HOLDER_DID}}', type: 'AchievementSubject' }
	};
}

/** No crypto: fake keys, echo the credential, canned VP. Never touches the network. */
const fakeCrypto = {
	generateKey: async () => ({ did: 'did:key:zFake', cryptosuite: 'eddsa-rdfc-2022' }),
	issueCredential: async ({ credential }: { credential: Record<string, unknown> }) => ({
		...credential,
		proof: { type: 'DataIntegrityProof', proofValue: `z${'A'.repeat(80)}2` }
	}),
	signPresentation: async () => ({ type: ['VerifiablePresentation'], holder: 'did:key:zFake' })
} as unknown as WalletCrypto;

const VPR = {
	verifiablePresentationRequest: {
		challenge: 'chal-1',
		query: [
			{ type: 'QueryByExample', example: { type: ['OpenBadgeCredential'] } },
			{ type: 'DIDAuthentication' }
		]
	}
};

/** An engaged exchange that returns a matchable VPR and accepts the submission. */
function transport(over?: {
	fetch?: Partial<FetchInteractionResult>;
	submit?: Partial<PostToVcapiResult>;
}): ExchangeFlowTransport {
	return {
		fetchInteractionUrl: async (): Promise<FetchInteractionResult> => ({
			ok: true,
			status: 200,
			vcapiUrl: 'https://verifier.test/vcapi/ex-1',
			tls: { ok: true, atLeastTls12: true, protocol: 'TLSv1.3' },
			rawBody: {},
			...over?.fetch
		}),
		postToVcapi: async (_url, body): Promise<PostToVcapiResult> => {
			const submitting = !!body && typeof body === 'object' && 'verifiablePresentation' in body;
			if (submitting)
				return { ok: true, status: 200, rawBody: { verified: true }, ...over?.submit };
			return { ok: true, status: 200, rawBody: VPR };
		}
	};
}

const okProbe = async (): Promise<TlsProbeResult> => ({
	ok: true,
	atLeastTls12: true,
	protocol: 'TLSv1.3'
});

const base = { doc: recipeDoc(), cryptosuite: 'eddsa-rdfc-2022' as const, crypto: fakeCrypto };

describe('presentToVcalmVerifier', () => {
	it('summarises a matched request and a landed submission', async () => {
		const { request, present } = await presentToVcalmVerifier({
			...base,
			doc: recipeDoc(),
			interactionUrl: 'https://verifier.test/interactions/ex-1',
			transport: transport(),
			probe: okProbe
		});

		expect(request).toMatchObject({
			transport: 'vcalm',
			vcapiAdvertised: true,
			vprReceived: true,
			vprMatched: true,
			didAuth: true
		});
		expect(request.requestTls.atLeastTls12).toBe(true);
		expect(request.responseTls.atLeastTls12).toBe(true);
		expect(present).toEqual({ submitted: true, transportStatus: 200 });
	});

	it('reports a rejected submission as submitted:false, not a throw', async () => {
		const { present } = await presentToVcalmVerifier({
			...base,
			doc: recipeDoc(),
			interactionUrl: 'https://verifier.test/interactions/ex-1',
			transport: transport({
				submit: { ok: false, status: 422, error: 'Exchange responded 422.' }
			}),
			probe: okProbe
		});

		expect(present.submitted).toBe(false);
		expect(present.error?.message).toMatch(/422/);
	});

	it('fails the floor cleanly on intake failure — no vcapi endpoint', async () => {
		const { request, present } = await presentToVcalmVerifier({
			...base,
			doc: recipeDoc(),
			interactionUrl: 'https://verifier.test/interactions/ex-1',
			transport: transport({ fetch: { ok: false, vcapiUrl: undefined, tls: undefined } }),
			probe: okProbe
		});

		expect(request.vcapiAdvertised).toBe(false);
		expect(request.vprReceived).toBe(false);
		expect(request.responseTls.atLeastTls12).toBe(false);
		expect(present.submitted).toBe(false);
	});

	it('throws PresentInputError for a blank interaction URL', async () => {
		await expect(
			presentToVcalmVerifier({
				...base,
				doc: recipeDoc(),
				interactionUrl: '   ',
				transport: transport(),
				probe: okProbe
			})
		).rejects.toBeInstanceOf(PresentInputError);
	});

	it('throws PresentInputError for a non-URL / non-http input', async () => {
		await expect(
			presentToVcalmVerifier({
				...base,
				doc: recipeDoc(),
				interactionUrl: 'not a url',
				transport: transport(),
				probe: okProbe
			})
		).rejects.toBeInstanceOf(PresentInputError);
		await expect(
			presentToVcalmVerifier({
				...base,
				doc: recipeDoc(),
				interactionUrl: 'ftp://verifier.test/ex',
				transport: transport(),
				probe: okProbe
			})
		).rejects.toBeInstanceOf(PresentInputError);
	});
});

describe('presentToVcalmVerifier — the display trace', () => {
	const url = 'https://verifier.test/interactions/ex-1';

	async function present(over?: Parameters<typeof transport>[0]) {
		return presentToVcalmVerifier({
			...base,
			doc: recipeDoc(),
			interactionUrl: url,
			transport: transport(over),
			probe: okProbe
		});
	}

	it('carries three stages in flow order on a complete present', async () => {
		const { trace } = await present();

		expect(trace?.stages.map((s) => s.name)).toEqual(['interaction', 'request', 'submission']);
		expect(trace?.stages[0]).toMatchObject({
			label: 'Interaction URL',
			method: 'GET',
			url,
			status: 200,
			ok: true
		});
		// The VPR is what the verifier asked the holder for.
		expect(trace?.stages[1]).toMatchObject({ label: 'Presentation request', ok: true });
		expect(trace?.stages[1].body).toMatchObject({ challenge: 'chal-1' });
		expect(trace?.stages[2]).toMatchObject({
			label: 'Presentation submission',
			method: 'POST',
			url: 'https://verifier.test/vcapi/ex-1',
			status: 200,
			ok: true
		});
	});

	it('stops at the interaction stage when the fetch failed', async () => {
		const { trace } = await present({
			fetch: { ok: false, status: 0, vcapiUrl: undefined, error: 'fetch failed' }
		});

		expect(trace?.stages).toHaveLength(1);
		expect(trace?.stages[0]).toMatchObject({ ok: false, error: 'fetch failed' });
	});

	it('stops at the interaction stage when no exchange endpoint was advertised', async () => {
		const { trace } = await present({ fetch: { vcapiUrl: undefined } });

		expect(trace?.stages).toHaveLength(1);
	});

	it('records a refused submission with its status and reason', async () => {
		const { present: delivery, trace } = await present({
			submit: { ok: false, status: 409, rawBody: { error: 'exchange already complete' } }
		});

		expect(delivery.submitted).toBe(false);
		expect(trace?.stages.at(-1)).toMatchObject({
			name: 'submission',
			status: 409,
			ok: false,
			body: { error: 'exchange already complete' }
		});
	});

	it('leaks neither the signed presentation nor the holder’s proof', async () => {
		const { trace } = await present();

		const serialised = JSON.stringify(trace);
		expect(serialised).not.toContain('VerifiablePresentation');
		expect(serialised).not.toContain('proofValue');
		expect(serialised).not.toContain('did:key:zFake');
	});
});

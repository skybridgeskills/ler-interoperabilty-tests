/**
 * A stand-in for `/api/exchange-runner/*`, so the scenario page's live states
 * can be driven without a transaction service.
 *
 * Storybook and the browser specs both need this: the page mints a real
 * exchange on mount, and every state after "creating" depends on what comes
 * back. Only the runner endpoints are intercepted — everything else falls
 * through to the real `fetch`, so a story that loads a font or an asset still
 * works.
 *
 * Returns an uninstall function. Callers must call it; leaving a global stubbed
 * would leak into whatever renders next.
 */
export type StubBehaviour =
	/** Mint, then report `complete` on the first poll. */
	| { kind: 'settles' }
	/** Mint, then poll forever without settling — the live, awaiting-wallet state. */
	| { kind: 'awaits' }
	/** Fail to mint at all — the harness-failed dead end. */
	| { kind: 'create-fails' };

export function stubExchangeApi(behaviour: StubBehaviour): () => void {
	const real = globalThis.fetch;

	globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

		// A `deliver-direct` step signs one credential here instead of minting an
		// exchange. `create-fails` models the signing route erroring; otherwise it
		// hands back a stub credential the step settles on.
		if (url.includes('/api/scenario-runner/deliver-direct')) {
			if (behaviour.kind === 'create-fails') {
				return jsonResponse(
					{ code: 500, message: 'Could not sign the deliverable credential.' },
					500
				);
			}
			return jsonResponse({
				credential: {
					type: ['VerifiableCredential', 'OpenBadgeCredential'],
					name: 'LER Interop Test Credential',
					proof: { type: 'DataIntegrityProof', proofValue: 'zStubProofValue' }
				}
			});
		}

		// A `present-to-verifier` step presents a credential to the operator's
		// verifier here. `create-fails` models the present route erroring; a URL
		// carrying `miss` returns an un-submitted delivery (the retry path);
		// otherwise a clean floor and a landed submission.
		if (url.includes('/api/scenario-runner/present')) {
			if (behaviour.kind === 'create-fails') {
				return jsonResponse(
					{ code: 500, message: 'Could not present the credential to the verifier.' },
					500
				);
			}
			const body = init?.body
				? (JSON.parse(init.body as string) as { interactionUrl?: string })
				: {};
			const miss = typeof body.interactionUrl === 'string' && body.interactionUrl.includes('miss');
			return jsonResponse({
				request: {
					transport: 'vcalm',
					vcapiAdvertised: true,
					vprReceived: true,
					vprMatched: true,
					didAuth: true,
					requestTls: { atLeastTls12: true, protocol: 'TLSv1.3' },
					responseTls: { atLeastTls12: true, protocol: 'TLSv1.3' }
				},
				present: miss
					? { submitted: false, error: { message: 'The exchange rejected the presentation.' } }
					: { submitted: true, transportStatus: 200 }
			});
		}

		if (!url.includes('/api/exchange-runner/')) return real(input, init);

		if (url.includes('/create')) {
			if (behaviour.kind === 'create-fails') {
				return jsonResponse(
					{
						code: 503,
						message: 'Exchange runner disabled',
						hint: 'Set EXCHANGE_RUNNER_ENABLED=true and run `pnpm turbo dev:full`.'
					},
					503
				);
			}
			return jsonResponse({
				exchangeId: 'story-exchange-1',
				protocols: {
					iu: 'http://localhost:4004/interactions/story-exchange-1',
					OID4VCI:
						'openid-credential-offer://?credential_offer_uri=http%3A%2F%2Flocalhost%3A4004%2Foffer'
				}
			});
		}

		if (url.includes('/protocols')) {
			return jsonResponse({
				exchangeId: 'attached-exchange-1',
				protocols: {
					iu: 'http://localhost:4004/interactions/attached-exchange-1',
					OID4VCI:
						'openid-credential-offer://?credential_offer_uri=http%3A%2F%2Flocalhost%3A4004%2Fattached'
				}
			});
		}

		const complete = behaviour.kind === 'settles';
		return jsonResponse({
			exchange: { id: 'story-exchange-1', state: complete ? 'complete' : 'pending', variables: {} },
			derived: {
				run: complete ? 'complete' : 'awaiting-wallet',
				perStep: [complete ? 'complete' : 'in-flight']
			}
		});
	}) as typeof fetch;

	return () => {
		globalThis.fetch = real;
	};
}

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

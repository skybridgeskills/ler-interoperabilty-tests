import { tamperClaimValue, tamperProofValue } from '$lib/server/domain/credential-tamper/index.js';
import {
	type PresentToOid4Result,
	type PresentToVcalmResult,
	presentToOid4Verifier,
	presentToVcalmVerifier
} from '$lib/server/domain/verifier-present/index.js';
import { makeHttpExchangeFlowTransport, probeTls } from '$lib/server/domain/wallet-client/index.js';
import { WalletCrypto } from '$lib/server/domain/wallet-crypto/index.js';

import type { ScenarioRunner } from './scenario-runner.js';
import { signDeliverable } from './sign-deliverable.js';

/** Production wiring: a real `WalletCrypto` signs each deliverable and drives each present locally. */
export function provideRealScenarioRunner(): { scenarioRunner: ScenarioRunner } {
	const crypto = WalletCrypto();
	return {
		scenarioRunner: {
			deliverDirect: (args) => signDeliverable(crypto, args),
			present: ({ doc, cryptosuite, tamper, transport, interactionUrl }) =>
				transport === 'oid4vp'
					? presentToOid4Verifier({
							doc,
							cryptosuite,
							...(tamper ? { tamper } : {}),
							input: interactionUrl,
							crypto,
							fetchImpl: fetch,
							probe: probeTls
						})
					: presentToVcalmVerifier({
							doc,
							cryptosuite,
							...(tamper ? { tamper } : {}),
							interactionUrl,
							crypto,
							transport: makeHttpExchangeFlowTransport(),
							probe: probeTls
						})
		}
	};
}

/**
 * Test wiring: deterministic, no crypto or network.
 *
 * `deliverDirect` stamps a fixed fake proof and applies the **real** shared
 * tamper helpers, so a test can assert `tamper` was honoured without a signing
 * backend. `present` returns a deterministic `{ request, present }` keyed by
 * `transport`: a clean floor + a landed submission, unless the pasted input
 * carries a sentinel — VCALM: `no-vcapi` fails intake, `miss` reports an
 * un-submitted delivery; OID4VP: `unresolved` fails the request, `jwt-only`
 * pins a JWT-only format, `inline` marks an inline request, `miss` an
 * un-submitted delivery — so route/controller tests can exercise those branches
 * without a network. The real signer's and present paths' honesty contracts are
 * proven separately (`sign-deliverable.test.ts`,
 * `present-to-{vcalm,oid4}-verifier.test.ts`).
 */
export function provideFakeScenarioRunner(): { scenarioRunner: ScenarioRunner } {
	return {
		scenarioRunner: {
			deliverDirect: async ({ doc, tamper }) => {
				const signed: Record<string, unknown> = {
					...doc,
					proof: {
						type: 'DataIntegrityProof',
						cryptosuite: 'fake',
						proofValue: `z${'A'.repeat(80)}2`
					}
				};
				if (tamper === 'proof') return tamperProofValue(signed);
				if (tamper === 'claim') return tamperClaimValue(signed);
				return signed;
			},
			present: async ({
				transport,
				interactionUrl
			}): Promise<PresentToVcalmResult | PresentToOid4Result> =>
				transport === 'oid4vp' ? fakeOid4Present(interactionUrl) : fakeVcalmPresent(interactionUrl)
		}
	};
}

/** Deterministic fake VCALM present; sentinels `no-vcapi` / `miss` in the URL drive the branches. */
function fakeVcalmPresent(interactionUrl: string): PresentToVcalmResult {
	const advertised = !interactionUrl.includes('no-vcapi');
	const submitted = advertised && !interactionUrl.includes('miss');
	return {
		request: {
			transport: 'vcalm',
			vcapiAdvertised: advertised,
			vprReceived: advertised,
			vprMatched: advertised,
			didAuth: advertised,
			requestTls: { atLeastTls12: true, protocol: 'TLSv1.3' },
			responseTls: advertised
				? { atLeastTls12: true, protocol: 'TLSv1.3' }
				: { atLeastTls12: false, error: 'The exchange advertised no endpoint to probe.' }
		},
		present: submitted
			? { submitted: true, transportStatus: 200 }
			: {
					submitted: false,
					...(advertised
						? {
								transportStatus: 400,
								error: { message: 'The exchange rejected the presentation.' }
							}
						: { error: { message: 'The interaction URL advertised no exchange endpoint.' } })
				}
	};
}

/**
 * Deterministic fake OID4VP present; sentinels in the pasted input drive the
 * branches: `unresolved` fails the request (scored, present skipped), `jwt-only`
 * pins a JWT-only format, `inline` marks an inline request, `miss` an
 * un-submitted delivery.
 */
function fakeOid4Present(input: string): PresentToOid4Result {
	if (input.includes('unresolved')) {
		return {
			request: {
				transport: 'oid4vp',
				requestForm: 'by-reference',
				requestResolved: false,
				matchable: false,
				matchReason: 'The request did not resolve.',
				diVpFormat: 'unpinned',
				requestTls: { atLeastTls12: false, error: 'not probed' },
				responseTls: { atLeastTls12: false, error: 'not probed' }
			},
			present: { submitted: false, error: { message: 'The request did not resolve.' } }
		};
	}
	const inline = input.includes('inline');
	const submitted = !input.includes('miss');
	return {
		request: {
			transport: 'oid4vp',
			requestForm: inline ? 'inline' : 'by-reference',
			requestResolved: true,
			matchable: true,
			diVpFormat: input.includes('jwt-only') ? 'jwt-only' : 'di',
			requestTls: inline
				? { atLeastTls12: true, protocol: 'inline (no request endpoint)' }
				: { atLeastTls12: true, protocol: 'TLSv1.3' },
			responseTls: { atLeastTls12: true, protocol: 'TLSv1.3' }
		},
		present: submitted
			? { submitted: true, transportStatus: 200 }
			: {
					submitted: false,
					transportStatus: 400,
					error: { message: 'The verifier rejected the presentation.' }
				}
	};
}

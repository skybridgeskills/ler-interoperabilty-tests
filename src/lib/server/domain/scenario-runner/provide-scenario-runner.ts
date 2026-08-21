import { tamperClaimValue, tamperProofValue } from '$lib/server/domain/credential-tamper/index.js';
import {
	type PresentToVcalmResult,
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
			present: ({ doc, cryptosuite, tamper, interactionUrl }) =>
				presentToVcalmVerifier({
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
 * backend. `present` returns a deterministic `{ request, present }`: a clean
 * VCALM floor and a landed submission, unless the interaction URL carries a
 * sentinel — `no-vcapi` fails intake, `miss` reports an un-submitted delivery —
 * so route/controller tests can exercise those branches without a network. The
 * real signer's and present path's honesty contracts are proven separately
 * (`sign-deliverable.test.ts`, `present-to-vcalm-verifier.test.ts`).
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
			present: async ({ interactionUrl }): Promise<PresentToVcalmResult> => {
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
		}
	};
}

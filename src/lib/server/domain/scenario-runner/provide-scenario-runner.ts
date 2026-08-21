import { tamperClaimValue, tamperProofValue } from '$lib/server/domain/credential-tamper/index.js';
import { WalletCrypto } from '$lib/server/domain/wallet-crypto/index.js';

import type { ScenarioRunner } from './scenario-runner.js';
import { signDeliverable } from './sign-deliverable.js';

/** Production wiring: a real `WalletCrypto` signs each deliverable locally. */
export function provideRealScenarioRunner(): { scenarioRunner: ScenarioRunner } {
	const crypto = WalletCrypto();
	return {
		scenarioRunner: {
			deliverDirect: (args) => signDeliverable(crypto, args)
		}
	};
}

/**
 * Test wiring: deterministic, no crypto or network. It stamps a fixed fake proof
 * onto the document and applies the **real** shared tamper helpers, so a test
 * can assert that `tamper` was honoured without a signing backend — while the
 * real signer's honesty contract is proven separately in `sign-deliverable.test.ts`.
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
			}
		}
	};
}

import { WalletCrypto } from '$lib/server/domain/wallet-crypto/index.js';

import { fakeGenerateRun } from './fake-generate-run.js';
import { generateVerifierRun } from './generate-run.js';
import { VerifierRunner } from './verifier-runner.js';

/** Production wiring: WalletCrypto-backed fixtures, secure shuffle. */
export function provideRealVerifierRunner() {
	const crypto = WalletCrypto();
	return {
		verifierRunner: VerifierRunner({
			generate: ({ cryptosuite }) => generateVerifierRun({ crypto, cryptosuite })
		})
	};
}

/** Test wiring: deterministic fixtures + ordering, no crypto; real scoring. */
export function provideFakeVerifierRunner() {
	return { verifierRunner: VerifierRunner({ generate: fakeGenerateRun }) };
}

export type VerifierRunnerCtx = ReturnType<typeof provideRealVerifierRunner>;

import { probeTls } from '$lib/server/domain/wallet-client/index.js';
import { WalletCrypto } from '$lib/server/domain/wallet-crypto/index.js';

import { fakeGenerateRun } from './fake-generate-run.js';
import { generateVerifierRun } from './generate-run.js';
import { fakeInspectOid4Request } from './oid4/fake-inspect-request.js';
import { fakePlanOid4Run } from './oid4/fake-plan-run.js';
import { fakePresentOid4Credential } from './oid4/fake-present-run.js';
import { inspectOid4Request } from './oid4/inspect-request.js';
import { generateOid4Plan } from './oid4/plan-run.js';
import { presentOid4Credential } from './oid4/present-run.js';
import { VerifierRunner } from './verifier-runner.js';

/** Production wiring: WalletCrypto-backed fixtures, secure shuffle, real fetch + TLS probe. */
export function provideRealVerifierRunner() {
	const crypto = WalletCrypto();
	return {
		verifierRunner: VerifierRunner({
			generate: ({ cryptosuite }) => generateVerifierRun({ crypto, cryptosuite }),
			inspectOid4: ({ input, cryptosuite }) =>
				inspectOid4Request({ input, cryptosuite, crypto, fetchImpl: fetch, tlsProbe: probeTls }),
			planOid4: ({ cryptosuite }) => generateOid4Plan({ cryptosuite }),
			presentOid4: ({ entry, input, cryptosuite }) =>
				presentOid4Credential({ entry, input, cryptosuite, crypto, fetchImpl: fetch })
		})
	};
}

/** Test wiring: deterministic fixtures + ordering, no crypto or network; real scoring. */
export function provideFakeVerifierRunner() {
	return {
		verifierRunner: VerifierRunner({
			generate: fakeGenerateRun,
			inspectOid4: fakeInspectOid4Request,
			planOid4: fakePlanOid4Run,
			presentOid4: fakePresentOid4Credential
		})
	};
}

export type VerifierRunnerCtx = ReturnType<typeof provideRealVerifierRunner>;

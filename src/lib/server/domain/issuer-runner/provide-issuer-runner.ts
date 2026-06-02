import { FakeVerifierCoreClient } from './fake-verifier-core-client.js';
import { IssuerRunner } from './issuer-runner.js';
import { RealVerifierCoreClient } from './verifier-core-client.js';

/** Production wiring: real verifier-core client. */
export function provideRealIssuerRunner() {
	return { issuerRunner: IssuerRunner({ verifierClient: RealVerifierCoreClient() }) };
}

/** Test wiring: in-memory verifier-core fake, no network calls. */
export function provideFakeIssuerRunner(presets?: Parameters<typeof FakeVerifierCoreClient>[0]) {
	return { issuerRunner: IssuerRunner({ verifierClient: FakeVerifierCoreClient(presets) }) };
}

export type IssuerRunnerCtx = ReturnType<typeof provideRealIssuerRunner>;

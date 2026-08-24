import type { AutomaticCheck } from '../automatic-checks.js';

import { keyProofSuiteResult } from './issuer-key-proof.js';

/**
 * We really did authenticate with a key of the `ecdsa-rdfc-2019` type — the
 * verify-what-you-got guard that makes `issuer-accepted-key-proof-ecdsa` mean
 * something rather than restate our own configuration.
 */
export const issuerKeyProofSuiteEcdsa: AutomaticCheck = {
	id: 'issuer-key-proof-suite-ecdsa',
	summary: 'We authenticated with a key matching `ecdsa-rdfc-2019`.',
	run: ({ stepId, evidence }) => keyProofSuiteResult(evidence, stepId, 'ecdsa-rdfc-2019')
};

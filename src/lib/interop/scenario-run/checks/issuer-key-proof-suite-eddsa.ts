import type { AutomaticCheck } from '../automatic-checks.js';

import { keyProofSuiteResult } from './issuer-key-proof.js';

/**
 * We really did authenticate with a key of the `eddsa-rdfc-2022` type — the
 * verify-what-you-got guard that makes `issuer-accepted-key-proof-eddsa` mean
 * something rather than restate our own configuration.
 */
export const issuerKeyProofSuiteEddsa: AutomaticCheck = {
	id: 'issuer-key-proof-suite-eddsa',
	summary: 'We authenticated with a key matching `eddsa-rdfc-2022`.',
	run: ({ stepId, evidence }) => keyProofSuiteResult(evidence, stepId, 'eddsa-rdfc-2022')
};

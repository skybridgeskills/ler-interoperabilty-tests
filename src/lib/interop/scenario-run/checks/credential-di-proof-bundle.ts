import type { AutomaticCheck } from '../automatic-checks.js';
import { artifactForStep } from '../evidence.js';

import { CRYPTOSUITE_BUNDLE, diProofResult } from './credential-di-proof.js';
import { credentialOf, NO_CREDENTIAL } from './credential-shape.js';

/**
 * The credential is signed with **a** cryptosuite from the bundle. Ported 1:1
 * from the live pages' `di-proof` row: `credential-issuance` fixes no suite of
 * its own, so the base requirement is the floor — signed with something we can
 * verify — and *which* suite is the `data-integrity-cryptosuites` additive's
 * question, not this one's.
 */
export const credentialDiProofBundle: AutomaticCheck = {
	id: 'credential-di-proof-bundle',
	summary: 'The credential carries a Data Integrity proof in the cryptosuite bundle.',
	run: ({ stepId, evidence }) =>
		diProofResult(
			credentialOf(artifactForStep(evidence, stepId)),
			CRYPTOSUITE_BUNDLE,
			NO_CREDENTIAL
		)
};

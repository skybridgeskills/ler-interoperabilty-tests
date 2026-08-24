import type { AutomaticCheck } from '../automatic-checks.js';
import { artifactForStep } from '../evidence.js';

import { diProofResult } from './credential-di-proof.js';
import { credentialOf, NO_CREDENTIAL } from './credential-shape.js';

/**
 * The credential is signed with `eddsa-rdfc-2022`. Ported from the direct page's
 * `data-integrity-eddsa-rdfc-2022` row, where the profile pins that one suite,
 * and reused by the `dic-issuer-eddsa` producer group, where the *point* is
 * which suite signed.
 */
export const credentialDiProofEddsa: AutomaticCheck = {
	id: 'credential-di-proof-eddsa',
	summary: 'The credential carries an `eddsa-rdfc-2022` Data Integrity proof.',
	run: ({ stepId, evidence }) =>
		diProofResult(
			credentialOf(artifactForStep(evidence, stepId)),
			['eddsa-rdfc-2022'],
			NO_CREDENTIAL
		)
};

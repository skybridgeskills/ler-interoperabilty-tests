import type { AutomaticCheck } from '../automatic-checks.js';
import { artifactForStep } from '../evidence.js';

import { diProofResult } from './credential-di-proof.js';
import { credentialOf, NO_CREDENTIAL } from './credential-shape.js';

/**
 * The credential is signed with `ecdsa-rdfc-2019` — the second half of the
 * producer axis. Nothing in the base profiles requires it; it is the
 * `dic-issuer-ecdsa` group's check, where the operator configures their issuer
 * to sign with ECDSA and runs one protocol.
 */
export const credentialDiProofEcdsa: AutomaticCheck = {
	id: 'credential-di-proof-ecdsa',
	summary: 'The credential carries an `ecdsa-rdfc-2019` Data Integrity proof.',
	run: ({ stepId, evidence }) =>
		diProofResult(
			credentialOf(artifactForStep(evidence, stepId)),
			['ecdsa-rdfc-2019'],
			NO_CREDENTIAL
		)
};

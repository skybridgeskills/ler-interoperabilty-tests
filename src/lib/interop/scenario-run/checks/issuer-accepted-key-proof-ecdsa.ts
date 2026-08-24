import type { AutomaticCheck } from '../automatic-checks.js';

import { acceptedKeyProofResult } from './issuer-key-proof.js';

/**
 * Your issuer accepted a holder key proof signed with `ecdsa-rdfc-2019` — the
 * `data-integrity-cryptosuites` **issuer consumer** measurement, for ECDSA.
 *
 * See `issuer-key-proof.ts` for why this axis pins a locally-generated key and
 * can therefore never render a scenario blocked.
 */
export const issuerAcceptedKeyProofEcdsa: AutomaticCheck = {
	id: 'issuer-accepted-key-proof-ecdsa',
	summary: 'Your issuer accepted a `ecdsa-rdfc-2019` holder key proof.',
	run: ({ stepId, evidence }) => acceptedKeyProofResult(evidence, stepId, 'ecdsa-rdfc-2019')
};

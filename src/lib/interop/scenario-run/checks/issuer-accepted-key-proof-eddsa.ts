import type { AutomaticCheck } from '../automatic-checks.js';

import { acceptedKeyProofResult } from './issuer-key-proof.js';

/**
 * Your issuer accepted a holder key proof signed with `eddsa-rdfc-2022` — the
 * `data-integrity-cryptosuites` **issuer consumer** measurement, for EdDSA.
 *
 * See `issuer-key-proof.ts` for why this axis pins a locally-generated key and
 * can therefore never render a scenario blocked.
 */
export const issuerAcceptedKeyProofEddsa: AutomaticCheck = {
	id: 'issuer-accepted-key-proof-eddsa',
	summary: 'Your issuer accepted a `eddsa-rdfc-2022` holder key proof.',
	run: ({ stepId, evidence }) => acceptedKeyProofResult(evidence, stepId, 'eddsa-rdfc-2022')
};

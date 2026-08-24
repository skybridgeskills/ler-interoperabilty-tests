import type { AutomaticCheck } from '../automatic-checks.js';

import { advertisesKeyProofSuiteResult } from './issuer-key-proof.js';

/**
 * Your issuer advertises `ecdsa-rdfc-2019` for `di_vp` key proofs. **OID4VCI only**, and
 * deliberately a SHOULD — advertising is not accepting, and an issuer that
 * accepts without listing has a documentation bug rather than an interop failure.
 */
export const issuerAdvertisesKeyProofEcdsa: AutomaticCheck = {
	id: 'issuer-advertises-key-proof-ecdsa',
	summary: 'Your issuer advertises `ecdsa-rdfc-2019` for `di_vp` key proofs.',
	run: ({ stepId, evidence }) => advertisesKeyProofSuiteResult(evidence, stepId, 'ecdsa-rdfc-2019')
};

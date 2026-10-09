import type { AutomaticCheck } from '../automatic-checks.js';

import { NO_PRESENTATION, presentationVerifiedFor, presentedVpFor } from './presented-vp.js';

/**
 * The presentation's proof verifies against the holder's key.
 *
 * Ported from `oid4.wallet.credential-presentation.vp-signature-valid`, which
 * reads `verifier-core`'s own verdict out of `results.default.verified` rather
 * than re-verifying: the suite is the verifier, and second-guessing its own
 * verification stack would measure the stack, not the wallet.
 *
 * Absorbs the `sign-vp` row on both profiles — "signs its presentations" and
 * "the signature verifies" are one fact with two ids. `mapping.md` §§ 3–4.
 *
 * The engine's `n/a` no-presentation branch resolves to **fail**.
 */
export const walletVpSignatureValid: AutomaticCheck = {
	id: 'wallet-vp-signature-valid',
	summary: 'The presentation proof verifies against the holder key.',
	run: ({ stepId, evidence }) => {
		if (presentedVpFor(evidence, stepId) === undefined) {
			return { met: false, detail: NO_PRESENTATION };
		}
		return presentationVerifiedFor(evidence, stepId)
			? { met: true, detail: 'The presentation proof verified against the holder key.' }
			: { met: false, detail: 'The presentation proof did not verify.' };
	}
};

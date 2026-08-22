import type { AutomaticCheck } from '../automatic-checks.js';

import { embeddedCredentialOf, NO_PRESENTATION, presentedVpFor } from './presented-vp.js';

/**
 * The credential inside the presentation still carries its issuer's proof — the
 * wallet embedded it, it did not re-sign it.
 *
 * Ported from the `data-integrity-cryptosuites` presentation row
 * `producer.preserve-vc-proofs`, and it lands on the **base** scenarios rather
 * than the additive ones because both base profiles already declare
 * `preserve-proofs` as a MUST of their own. One fact, one row. `mapping.md` § 5.
 *
 * **Presence-only, deliberately.** The suite never held the operator's original
 * credential — the wallet was carrying it before this run started — so there is
 * nothing to diff against and verbatim identity is not assertable. That is the
 * honest black-box signal, and the black-box scoring ADR says so; a check
 * claiming more would be claiming to see something we cannot.
 */
export const walletVpPreservesVcProofs: AutomaticCheck = {
	id: 'wallet-vp-preserves-vc-proofs',
	summary: 'The embedded credential still carries its original proof.',
	run: ({ stepId, evidence }) => {
		const vp = presentedVpFor(evidence, stepId);
		if (vp === undefined) return { met: false, detail: NO_PRESENTATION };

		const embedded = embeddedCredentialOf(vp) as { proof?: unknown } | undefined;
		if (!embedded || typeof embedded !== 'object') {
			return { met: false, detail: 'The presentation embeds no credential.' };
		}
		return embedded.proof !== undefined
			? { met: true, detail: 'The embedded credential carries a proof.' }
			: {
					met: false,
					detail: 'The embedded credential has no proof — it was stripped or re-issued.'
				};
	}
};

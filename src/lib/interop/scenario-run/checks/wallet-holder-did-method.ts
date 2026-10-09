import type { AutomaticCheck } from '../automatic-checks.js';

import { NO_PRESENTATION, presentedVpFor, vpHolderDidOf } from './presented-vp.js';

/**
 * The holder identifier is a `did:key` or `did:web`.
 *
 * Ported from the `data-integrity-cryptosuites` presentation row
 * `producer.holder-did-method`. Shared by all four wallet producer scenarios —
 * the DID method question is the same whichever cryptosuite the scenario is
 * about, which is why both `oneOf` groups name the one check.
 *
 * The engine's `n/a` "no holder DID recorded" branch resolves to **fail**: the
 * absence means the presentation never arrived, which is an upstream failure and
 * not a rule with nothing to apply to.
 */
export const walletHolderDidMethod: AutomaticCheck = {
	id: 'wallet-holder-did-method',
	summary: 'The holder identifier uses `did:key` or `did:web`.',
	run: ({ stepId, evidence }) => {
		const vp = presentedVpFor(evidence, stepId);
		if (vp === undefined) return { met: false, detail: NO_PRESENTATION };

		const did = vpHolderDidOf(vp);
		if (!did) return { met: false, detail: 'The presentation names no holder DID.' };
		return did.startsWith('did:key:') || did.startsWith('did:web:')
			? { met: true, detail: `The holder is \`${did}\`.` }
			: {
					met: false,
					detail: `The holder is \`${did}\` — this requires \`did:key\` or \`did:web\`.`
				};
	}
};

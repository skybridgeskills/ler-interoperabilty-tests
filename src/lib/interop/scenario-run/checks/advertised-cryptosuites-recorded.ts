import type { AutomaticCheck } from '../automatic-checks.js';
import { exchangeVariable } from '../evidence.js';

/**
 * The exchange records the extra cryptosuites we advertised.
 *
 * The ADVERTISE-TO-OBSERVE bait: suite names unioned into the advertised
 * `cryptosuite_values` to coax a conformant wallet into deriving a
 * selective-disclosure proof so it can be observed on the wire. This check
 * measures only that the bait was **set**; whether the wallet took it is a
 * separate, wallet-facing measurement.
 *
 * Presence is the proof, as with the other recorded-variation checks, and the
 * wording names the harness: an unset bait is this deployment's shortfall.
 */
export const advertisedCryptosuitesRecorded: AutomaticCheck = {
	id: 'advertised-cryptosuites-recorded',
	summary: 'The verifier advertised the extra cryptosuites this scenario pinned.',
	run: ({ stepId, evidence }) => {
		const value = exchangeVariable(evidence, stepId, 'vprAdvertiseCryptosuites');
		return value !== undefined
			? {
					met: true,
					detail: `The exchange records the advertised cryptosuites \`${JSON.stringify(value)}\`.`
				}
			: {
					met: false,
					detail:
						'The exchange records no advertised cryptosuites — this deployment may not support ' +
						'them, so the verifier advertised only what it can verify.'
				};
	}
};

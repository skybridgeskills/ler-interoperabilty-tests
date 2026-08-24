import type { AutomaticCheck } from '../automatic-checks.js';

import { vpCryptosuiteResult } from './wallet-holder-key.js';

/**
 * The presentation was signed with `ecdsa-rdfc-2019`.
 *
 * The `dic-wallet-present-ecdsa` group's cryptosuite row — the P-256 half of the
 * split described in `wallet-vp-cryptosuite-eddsa`.
 */
export const walletVpCryptosuiteEcdsa: AutomaticCheck = {
	id: 'wallet-vp-cryptosuite-ecdsa',
	summary: 'The presentation was signed with `ecdsa-rdfc-2019`.',
	run: ({ stepId, evidence }) => vpCryptosuiteResult(evidence, stepId, 'ecdsa-rdfc-2019')
};

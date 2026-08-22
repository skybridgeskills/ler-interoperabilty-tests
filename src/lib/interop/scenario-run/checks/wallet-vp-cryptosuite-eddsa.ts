import type { AutomaticCheck } from '../automatic-checks.js';

import { vpCryptosuiteResult } from './wallet-holder-key.js';

/**
 * The presentation was signed with `eddsa-rdfc-2022`.
 *
 * The `dic-wallet-present-eddsa` group's cryptosuite row. Split from the single
 * `producer.vp-cryptosuite-supported` checklist row, which asked only "one of
 * the bundle" and so could not say *which* suite a wallet had proven — the
 * additive's whole point.
 */
export const walletVpCryptosuiteEddsa: AutomaticCheck = {
	id: 'wallet-vp-cryptosuite-eddsa',
	summary: 'The presentation was signed with `eddsa-rdfc-2022`.',
	run: ({ stepId, evidence }) => vpCryptosuiteResult(evidence, stepId, 'eddsa-rdfc-2022')
};

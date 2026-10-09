import type { AutomaticCheck } from '../automatic-checks.js';

import { holderKeyTypeResult } from './wallet-holder-key.js';

/** The holder key the presentation was signed with is a P-256 key. */
export const walletHolderKeyTypeEcdsa: AutomaticCheck = {
	id: 'wallet-holder-key-type-ecdsa',
	summary: 'The holder’s `did:key` encodes a P-256 key.',
	run: ({ stepId, evidence }) => holderKeyTypeResult(evidence, stepId, 'ecdsa-rdfc-2019')
};

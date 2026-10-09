import type { AutomaticCheck } from '../automatic-checks.js';

import { holderKeyTypeResult } from './wallet-holder-key.js';

/** The holder key the presentation was signed with is an Ed25519 key. */
export const walletHolderKeyTypeEddsa: AutomaticCheck = {
	id: 'wallet-holder-key-type-eddsa',
	summary: 'The holder’s `did:key` encodes an Ed25519 key.',
	run: ({ stepId, evidence }) => holderKeyTypeResult(evidence, stepId, 'eddsa-rdfc-2022')
};

import type { AutomaticCheck } from '../automatic-checks.js';
import { exchangeVariable } from '../evidence.js';

/**
 * The wallet proved control of a DID, and the credential was bound to it.
 *
 * Genuinely readable from the wire: the holder DID arrives in the DIDAuth
 * presentation and the transaction service writes it into the exchange
 * (`holderDid`, or `didAuthHolderDid` on the DIDAuth path) before it stamps
 * `credentialSubject.id`. Unlike the acceptance questions, there is nothing an
 * operator could add here.
 */
export const holderDidBound: AutomaticCheck = {
	id: 'holder-did-bound',
	summary: 'The wallet proved control of a DID and the credential bound to it.',
	run: ({ stepId, evidence }) => {
		const holderDid =
			exchangeVariable(evidence, stepId, 'holderDid') ??
			exchangeVariable(evidence, stepId, 'didAuthHolderDid');

		if (typeof holderDid === 'string' && holderDid.length > 0) {
			return { met: true, detail: `Bound to ${holderDid}.` };
		}
		return { met: false, detail: 'No holder DID was asserted.' };
	}
};

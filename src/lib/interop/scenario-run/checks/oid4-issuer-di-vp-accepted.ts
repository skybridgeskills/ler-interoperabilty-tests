import type { AutomaticCheck } from '../automatic-checks.js';
import { issuerFlowForStep } from '../evidence.js';

/**
 * Your issuer accepted our `di_vp` key proof. Ported 1:1 from the issuer
 * engine's `di-vp-required` row, including its honesty caveat: **rejecting a
 * malformed proof is not negatively probed**, so this says only that a
 * well-formed one was accepted.
 *
 * Shares `credentialDelivered` with `oid4-issuer-credential-endpoint` and stays
 * separate for the reason recorded there — a different question about the same
 * observation.
 */
export const oid4IssuerDiVpAccepted: AutomaticCheck = {
	id: 'oid4-issuer-di-vp-accepted',
	summary: 'Your issuer accepted our Data Integrity (`di_vp`) key proof.',
	run: ({ stepId, evidence }) => {
		const flow = issuerFlowForStep(evidence, stepId);
		if (!flow) return { met: false, detail: 'This step received nothing from an issuer.' };
		if (flow.transport !== 'oid4vci')
			return { met: false, detail: 'This step did not receive over OID4VCI.' };
		return flow.credentialDelivered
			? {
					met: true,
					detail:
						'Your issuer accepted our `di_vp` key proof — bound to the issued `c_nonce` and your domain — and issued against it. Rejecting a malformed proof is not negatively probed.'
				}
			: {
					met: false,
					detail: 'Your issuer issued nothing in response to our `di_vp` key proof.'
				};
	}
};

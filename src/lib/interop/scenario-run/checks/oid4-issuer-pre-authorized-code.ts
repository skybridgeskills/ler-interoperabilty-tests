import type { AutomaticCheck } from '../automatic-checks.js';
import { issuerFlowForStep } from '../evidence.js';

/**
 * Your token endpoint accepted the pre-authorized-code grant. Ported 1:1 from
 * the issuer engine's `pre-authorized-code-flow` row. The profile standardises
 * OID4VCI issuance on the pre-authorized-code flow; there are no
 * authorization-code clauses to fall back to.
 */
export const oid4IssuerPreAuthorizedCode: AutomaticCheck = {
	id: 'oid4-issuer-pre-authorized-code',
	summary: 'Your token endpoint accepted the pre-authorized-code grant.',
	run: ({ stepId, evidence }) => {
		const flow = issuerFlowForStep(evidence, stepId);
		if (!flow) return { met: false, detail: 'This step received nothing from an issuer.' };
		if (flow.transport !== 'oid4vci')
			return { met: false, detail: 'This step did not receive over OID4VCI.' };
		return flow.preAuthCodeRedeemed
			? {
					met: true,
					detail:
						'Your token endpoint accepted the pre-authorized-code grant and issued an access token.'
				}
			: { met: false, detail: 'Your token endpoint did not accept the pre-authorized-code grant.' };
	}
};

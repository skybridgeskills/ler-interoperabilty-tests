import type { AutomaticCheck } from '../automatic-checks.js';
import { issuerFlowForStep } from '../evidence.js';

/**
 * Your issuer asked the suite to authenticate a DID before it would issue.
 * Ported from the issuer engine's `didauth-requested` row.
 *
 * **Resolution (M11):** the engine returned `warn` when a challenge came back
 * but the VPR carried no explicit `DIDAuthentication` query. That resolves to a
 * **fail**: the requirement is that the issuer *requests DID authentication*,
 * and a bare challenge does not evidence that — a holder implementation reading
 * only the query would never authenticate. The automatic model has no `warn`,
 * and reporting this as a pass would overstate what was observed.
 */
export const vcalmIssuerDidauthRequested: AutomaticCheck = {
	id: 'vcalm-issuer-didauth-requested',
	summary: 'Your issuer requested DID authentication before issuing.',
	run: ({ stepId, evidence }) => {
		const flow = issuerFlowForStep(evidence, stepId);
		if (!flow) return { met: false, detail: 'This step received nothing from an issuer.' };
		if (flow.transport !== 'vcalm')
			return { met: false, detail: 'This step did not receive over VCALM.' };
		if (!flow.didAuthRequested) {
			return { met: false, detail: 'Your issuer returned no DID-authentication challenge.' };
		}
		if (flow.didAuthQueryMissing) {
			return {
				met: false,
				detail:
					'A challenge came back, but the presentation request carried no explicit `DIDAuthentication` query.'
			};
		}
		return {
			met: true,
			detail: 'Your issuer returned a `DIDAuthentication` request with a challenge before issuing.'
		};
	}
};

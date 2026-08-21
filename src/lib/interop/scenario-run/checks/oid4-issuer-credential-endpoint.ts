import type { AutomaticCheck } from '../automatic-checks.js';
import { issuerFlowForStep } from '../evidence.js';

/**
 * Your credential endpoint answered a Bearer-authorised request with a
 * credential. Ported 1:1 from the issuer engine's `credential-endpoint` row,
 * including its honesty caveat: **error handling and status codes are not
 * negatively probed**, so this says only that the happy path worked.
 *
 * It reads the same `credentialDelivered` fact as `oid4-issuer-di-vp-accepted`
 * and stays a separate row, as in the engine — this asks *did your credential
 * endpoint work*, that one asks *did our key proof satisfy you*.
 */
export const oid4IssuerCredentialEndpoint: AutomaticCheck = {
	id: 'oid4-issuer-credential-endpoint',
	summary: 'Your credential endpoint delivered a credential to a Bearer-authorised request.',
	run: ({ stepId, evidence }) => {
		const flow = issuerFlowForStep(evidence, stepId);
		if (!flow) return { met: false, detail: 'This step received nothing from an issuer.' };
		if (flow.transport !== 'oid4vci')
			return { met: false, detail: 'This step did not receive over OID4VCI.' };
		return flow.credentialDelivered
			? {
					met: true,
					detail:
						'Your credential endpoint required a Bearer token and delivered a credential. Error handling and status codes are not negatively probed.'
				}
			: {
					met: false,
					detail: `Your credential endpoint delivered no credential${flow.credentialStatus !== undefined ? ` (it responded ${flow.credentialStatus})` : ''}.`
				};
	}
};

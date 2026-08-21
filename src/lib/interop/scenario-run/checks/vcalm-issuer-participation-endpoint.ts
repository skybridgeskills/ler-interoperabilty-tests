import type { AutomaticCheck } from '../automatic-checks.js';
import { issuerFlowForStep } from '../evidence.js';

/**
 * The exchange-participation endpoint answered with an interaction-protocols
 * object. Ported 1:1 from the issuer engine's `participation-endpoint` row.
 *
 * Reads the **same single driver probe** as `vcalm-issuer-interaction-url`. Two
 * checklist rows over one observation, kept faithful to the checklist and honest
 * in the message about sharing a probe.
 */
export const vcalmIssuerParticipationEndpoint: AutomaticCheck = {
	id: 'vcalm-issuer-participation-endpoint',
	summary: 'The exchange-participation endpoint returned interaction protocols.',
	run: ({ stepId, evidence }) => {
		const flow = issuerFlowForStep(evidence, stepId);
		if (!flow) return { met: false, detail: 'This step received nothing from an issuer.' };
		if (flow.transport !== 'vcalm')
			return { met: false, detail: 'This step did not receive over VCALM.' };
		return flow.participationOk
			? {
					met: true,
					detail:
						'The participation endpoint answered with an interaction-protocols object — one probe, shared with the interaction-URL row.'
				}
			: {
					met: false,
					detail: 'The participation endpoint did not answer with an interaction-protocols object.'
				};
	}
};

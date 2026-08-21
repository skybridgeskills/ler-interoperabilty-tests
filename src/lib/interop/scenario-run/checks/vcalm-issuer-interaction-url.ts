import type { AutomaticCheck } from '../automatic-checks.js';
import { issuerFlowForStep } from '../evidence.js';

/**
 * The interaction URL the operator pasted resolved and returned VCALM
 * interaction protocols. Ported 1:1 from the issuer engine's
 * `interaction-url-fetchable` row.
 *
 * This and `vcalm-issuer-participation-endpoint` read the **same single driver
 * probe** — the checklist asked two questions of one observation, and both are
 * kept rather than silently collapsed. Both messages say so, so two green rows
 * are not mistaken for two independent measurements.
 */
export const vcalmIssuerInteractionUrl: AutomaticCheck = {
	id: 'vcalm-issuer-interaction-url',
	summary: 'The interaction URL resolved and returned VCALM interaction protocols.',
	run: ({ stepId, evidence }) => {
		const flow = issuerFlowForStep(evidence, stepId);
		if (!flow) return { met: false, detail: 'This step received nothing from an issuer.' };
		if (flow.transport !== 'vcalm')
			return { met: false, detail: 'This step did not receive over VCALM.' };
		return flow.interactionFetched
			? {
					met: true,
					detail:
						'The interaction URL resolved and returned interaction protocols — the same probe the participation-endpoint row reads.'
				}
			: {
					met: false,
					detail: 'The interaction URL did not resolve to a VCALM interaction-protocols object.'
				};
	}
};

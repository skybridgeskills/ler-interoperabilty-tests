import type { AutomaticCheck } from '../automatic-checks.js';
import { issuerFlowForStep } from '../evidence.js';

/**
 * The interaction protocols advertised a `vcapi` exchange endpoint. Ported 1:1
 * from the issuer engine's `vcapi-in-protocols` row — the entry the suite needs
 * to engage the exchange as holder at all.
 */
export const vcalmIssuerVcapiInProtocols: AutomaticCheck = {
	id: 'vcalm-issuer-vcapi-in-protocols',
	summary: 'The interaction protocols include a `vcapi` exchange endpoint.',
	run: ({ stepId, evidence }) => {
		const flow = issuerFlowForStep(evidence, stepId);
		if (!flow) return { met: false, detail: 'This step received nothing from an issuer.' };
		if (flow.transport !== 'vcalm')
			return { met: false, detail: 'This step did not receive over VCALM.' };
		return flow.vcapiAdvertised
			? { met: true, detail: 'The interaction protocols include an absolute `vcapi` URL.' }
			: { met: false, detail: 'The interaction protocols included no absolute `vcapi` URL.' };
	}
};

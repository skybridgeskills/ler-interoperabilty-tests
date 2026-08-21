import type { AutomaticCheck } from '../automatic-checks.js';
import { verifierRequestForStep } from '../evidence.js';

/**
 * The operator's verifier advertised a `vcapi` exchange endpoint — the intake
 * check for the VCALM floor. Ported 1:1 from the verifier-runner `vcalm` floor
 * (`vpr-checks.ts`): pass when the pasted interaction URL resolved a `vcapi`
 * exchange, fail otherwise (an intake failure, which the model records as a
 * clean fail rather than an `n/a` — there is no `n/a` for an automatic outcome).
 */
export const vcalmInteractionEndpoint: AutomaticCheck = {
	id: 'vcalm-interaction-endpoint',
	summary: 'The interaction URL advertised a `vcapi` exchange endpoint.',
	run: ({ stepId, evidence }) => {
		const request = verifierRequestForStep(evidence, stepId);
		if (!request) return { met: false, detail: 'This step did not present to a verifier.' };
		if (request.transport !== 'vcalm')
			return { met: false, detail: 'This step did not present over VCALM.' };
		return request.vcapiAdvertised
			? { met: true, detail: 'The interaction URL advertised a `vcapi` exchange endpoint.' }
			: {
					met: false,
					detail: 'The interaction URL did not advertise a `vcapi` exchange endpoint.'
				};
	}
};

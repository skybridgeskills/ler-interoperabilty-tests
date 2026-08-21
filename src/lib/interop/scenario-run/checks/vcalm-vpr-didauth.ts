import type { AutomaticCheck } from '../automatic-checks.js';
import { verifierRequestForStep } from '../evidence.js';

/**
 * The verifier's presentation request included a DIDAuthentication query. Ported
 * 1:1 from the verifier-runner `vcalm` floor: pass when present, fail when
 * absent.
 */
export const vcalmVprDidauth: AutomaticCheck = {
	id: 'vcalm-vpr-didauth',
	summary: 'The presentation request includes a DIDAuthentication query.',
	run: ({ stepId, evidence }) => {
		const request = verifierRequestForStep(evidence, stepId);
		if (!request) return { met: false, detail: 'This step did not present to a verifier.' };
		return request.didAuth
			? { met: true, detail: 'The presentation request includes a DIDAuthentication query.' }
			: {
					met: false,
					detail: 'The presentation request does not include a DIDAuthentication query.'
				};
	}
};

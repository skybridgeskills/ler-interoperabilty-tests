import type { AutomaticCheck } from '../automatic-checks.js';
import { verifierRequestForStep } from '../evidence.js';

/**
 * The verifier's presentation request asked for an OpenBadgeCredential via
 * QueryByExample. Ported 1:1 from the verifier-runner `vcalm` floor: fail when
 * no VPR was returned, or when the QueryByExample did not match (the reason the
 * matcher gave is surfaced as the detail); pass when it matched.
 */
export const vcalmVprQuery: AutomaticCheck = {
	id: 'vcalm-vpr-query',
	summary: 'The presentation request asks for an OpenBadgeCredential via QueryByExample.',
	run: ({ stepId, evidence }) => {
		const request = verifierRequestForStep(evidence, stepId);
		if (!request) return { met: false, detail: 'This step did not present to a verifier.' };
		if (request.transport !== 'vcalm')
			return { met: false, detail: 'This step did not present over VCALM.' };
		if (!request.vprReceived) {
			return { met: false, detail: 'The exchange returned no presentation request.' };
		}
		return request.vprMatched
			? {
					met: true,
					detail: 'The presentation request asks for an OpenBadgeCredential via QueryByExample.'
				}
			: {
					met: false,
					detail:
						request.matchReason ??
						'The presentation request did not ask for an OpenBadgeCredential.'
				};
	}
};

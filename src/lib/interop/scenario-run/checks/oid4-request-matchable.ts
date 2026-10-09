import type { AutomaticCheck } from '../automatic-checks.js';
import { verifierRequestForStep } from '../evidence.js';

/**
 * The verifier's request asked for an OpenBadgeCredential — its
 * `presentation_definition` matched a seeded OB3. Ported from the verifier-runner
 * `oid4` floor: pass when a seeded OpenBadgeCredential satisfied the definition,
 * fail (with the matcher's reason) otherwise.
 */
export const oid4RequestMatchable: AutomaticCheck = {
	id: 'oid4-request-matchable',
	summary: 'The request’s presentation definition matched an OpenBadgeCredential.',
	run: ({ stepId, evidence }) => {
		const request = verifierRequestForStep(evidence, stepId);
		if (!request) return { met: false, detail: 'This step did not present to a verifier.' };
		if (request.transport !== 'oid4vp')
			return { met: false, detail: 'This step did not present over OID4VP.' };
		return request.matchable
			? { met: true, detail: 'The presentation definition matched an OpenBadgeCredential.' }
			: {
					met: false,
					detail:
						request.matchReason ??
						'The presentation definition did not match an OpenBadgeCredential.'
				};
	}
};

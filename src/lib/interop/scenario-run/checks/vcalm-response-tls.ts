import type { AutomaticCheck } from '../automatic-checks.js';
import { verifierRequestForStep } from '../evidence.js';

import { tlsCheckResult } from './vcalm-tls.js';

/**
 * The `vcapi` exchange (response) host negotiated TLS 1.2 or above. Ported 1:1
 * from the verifier-runner `vcalm` floor.
 */
export const vcalmResponseTls: AutomaticCheck = {
	id: 'vcalm-response-tls',
	summary: 'The exchange endpoint negotiated TLS 1.2 or above.',
	run: ({ stepId, evidence }) => {
		const request = verifierRequestForStep(evidence, stepId);
		if (!request) return { met: false, detail: 'This step did not present to a verifier.' };
		return tlsCheckResult(request.responseTls, 'exchange endpoint');
	}
};

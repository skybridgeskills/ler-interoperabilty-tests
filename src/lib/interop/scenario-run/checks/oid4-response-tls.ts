import type { AutomaticCheck } from '../automatic-checks.js';
import { verifierRequestForStep } from '../evidence.js';

/**
 * The response (`response_uri`) endpoint used TLS 1.2 or above — a MUST. The
 * response endpoint always exists (it carries the credential's `vp_token`), so
 * this is a hard TLS check, unlike the request endpoint (inline requests have
 * none).
 */
export const oid4ResponseTls: AutomaticCheck = {
	id: 'oid4-response-tls',
	summary: 'The response endpoint negotiated TLS 1.2 or above.',
	run: ({ stepId, evidence }) => {
		const request = verifierRequestForStep(evidence, stepId);
		if (!request) return { met: false, detail: 'This step did not present to a verifier.' };
		if (request.transport !== 'oid4vp')
			return { met: false, detail: 'This step did not present over OID4VP.' };
		return request.responseTls.atLeastTls12
			? { met: true, detail: 'The response endpoint negotiated TLS 1.2 or above.' }
			: {
					met: false,
					detail: request.responseTls.error ?? 'The response endpoint did not negotiate TLS 1.2.'
				};
	}
};

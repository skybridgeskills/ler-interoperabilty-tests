import type { AutomaticCheck } from '../automatic-checks.js';
import { verifierRequestForStep } from '../evidence.js';

/**
 * The request endpoint used TLS 1.2 or above. A **SHOULD** (M10b): the
 * credential's real transport is the response endpoint (`oid4-response-tls`,
 * MUST); the request object's transport is best-practice. For an **inline**
 * request there is no endpoint to probe, so the leaf writes a synthetic met
 * summary and this reads as met (nothing to fault) — the not-met case is a
 * by-reference request on TLS < 1.2.
 */
export const oid4RequestTls: AutomaticCheck = {
	id: 'oid4-request-tls',
	summary: 'The request endpoint negotiated TLS 1.2 or above (inline requests pass).',
	run: ({ stepId, evidence }) => {
		const request = verifierRequestForStep(evidence, stepId);
		if (!request) return { met: false, detail: 'This step did not present to a verifier.' };
		if (request.transport !== 'oid4vp')
			return { met: false, detail: 'This step did not present over OID4VP.' };
		return request.requestTls.atLeastTls12
			? {
					met: true,
					detail:
						request.requestForm === 'inline'
							? 'The request was provided inline — there is no request endpoint to probe.'
							: 'The request endpoint negotiated TLS 1.2 or above.'
				}
			: {
					met: false,
					detail: request.requestTls.error ?? 'The request endpoint did not negotiate TLS 1.2.'
				};
	}
};

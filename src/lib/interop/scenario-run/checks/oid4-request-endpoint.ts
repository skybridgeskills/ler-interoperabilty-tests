import type { AutomaticCheck } from '../automatic-checks.js';
import { verifierRequestForStep } from '../evidence.js';

/**
 * The operator's verifier produced a resolvable OID4VP authorization request —
 * the intake check for the OID4 floor. Ported from the verifier-runner `oid4`
 * floor (`inspect-request.ts`): pass when the pasted request parsed and validated
 * as an OID4VP authorization request, fail otherwise (a malformed request is an
 * intake failure the model records as a clean fail — there is no `n/a`).
 */
export const oid4RequestEndpoint: AutomaticCheck = {
	id: 'oid4-request-endpoint',
	summary: 'The pasted authorization request parsed and validated as OID4VP.',
	run: ({ stepId, evidence }) => {
		const request = verifierRequestForStep(evidence, stepId);
		if (!request) return { met: false, detail: 'This step did not present to a verifier.' };
		if (request.transport !== 'oid4vp')
			return { met: false, detail: 'This step did not present over OID4VP.' };
		return request.requestResolved
			? { met: true, detail: 'The authorization request resolved and validated as OID4VP.' }
			: {
					met: false,
					detail: request.matchReason ?? 'The authorization request did not resolve as OID4VP.'
				};
	}
};

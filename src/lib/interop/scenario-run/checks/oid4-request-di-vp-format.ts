import type { AutomaticCheck } from '../automatic-checks.js';
import { verifierRequestForStep } from '../evidence.js';

/**
 * The request accepts a Data Integrity verifiable presentation — it does not
 * advertise JWT VP formats exclusively. Resolved policy (M10b): a DI-pinned
 * request (`di`) and one that declares nothing or a mixed non-JWT set
 * (`unpinned`) both pass; only a `jwt-only` request fails — a DI-proof OB3
 * cannot be presented to a JWT-only verifier (a genuine interop-breaker). Don't
 * over-fail a lenient verifier that omits `format`.
 */
export const oid4RequestDiVpFormat: AutomaticCheck = {
	id: 'oid4-request-di-vp-format',
	summary: 'The request accepts a Data Integrity VP format (not JWT-only).',
	run: ({ stepId, evidence }) => {
		const request = verifierRequestForStep(evidence, stepId);
		if (!request) return { met: false, detail: 'This step did not present to a verifier.' };
		if (request.transport !== 'oid4vp')
			return { met: false, detail: 'This step did not present over OID4VP.' };
		if (request.diVpFormat === 'jwt-only') {
			return {
				met: false,
				detail:
					'The request accepts only JWT VP formats — a Data Integrity VP (`ldp_vp`/`di_vp`) is required.'
			};
		}
		return {
			met: true,
			detail:
				request.diVpFormat === 'di'
					? 'The request pins a Data Integrity VP format.'
					: 'The request does not restrict to JWT-only formats.'
		};
	}
};

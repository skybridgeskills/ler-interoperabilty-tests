import type { AutomaticCheck } from '../automatic-checks.js';
import { issuerFlowForStep } from '../evidence.js';

/**
 * Your issuer does not require a JWT-only key proof. Ported 1:1 from the issuer
 * engine's `not-jwt-only-proof` row.
 *
 * It reads the same `diVpOffered` fact as `oid4-issuer-di-vp-proof-type` and
 * stays a separate row, as in the engine: one asks *do you offer what this
 * profile needs*, the other *do you refuse everything else*. Both messages are
 * written so a reader can tell which question they answer.
 */
export const oid4IssuerNotJwtOnlyProof: AutomaticCheck = {
	id: 'oid4-issuer-not-jwt-only-proof',
	summary: 'Your issuer does not require a JWT-only key proof.',
	run: ({ stepId, evidence }) => {
		const flow = issuerFlowForStep(evidence, stepId);
		if (!flow) return { met: false, detail: 'This step received nothing from an issuer.' };
		if (flow.transport !== 'oid4vci')
			return { met: false, detail: 'This step did not receive over OID4VCI.' };
		return flow.diVpOffered
			? {
					met: true,
					detail:
						'A `di_vp` key-proof type is offered, so your issuer does not require a JWT-only proof.'
				}
			: {
					met: false,
					detail:
						'Only JWT key proofs are on offer; this profile requires that a `di_vp` key proof be accepted.'
				};
	}
};

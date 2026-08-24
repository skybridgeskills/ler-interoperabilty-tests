import type { AutomaticCheck } from '../automatic-checks.js';
import { issuerFlowForStep } from '../evidence.js';

/**
 * Your issuer advertises a `di_vp` signing algorithm we can actually sign with.
 * Ported from the issuer engine's `di-vp-signing-algs` row.
 *
 * **Resolution (M11):** the engine returned `warn` when the advertised
 * algorithms listed none of the rdfc bundle. That resolves to a **fail**: a
 * `di_vp` proof type the suite cannot sign for is not interoperable, and it
 * fails for the same reason an absent `proof_signing_alg_values_supported`
 * already did. The automatic model has no `warn`.
 */
export const oid4IssuerDiVpSigningAlgs: AutomaticCheck = {
	id: 'oid4-issuer-di-vp-signing-algs',
	summary: 'Your issuer advertises a `di_vp` signing algorithm in the cryptosuite bundle.',
	run: ({ stepId, evidence }) => {
		const flow = issuerFlowForStep(evidence, stepId);
		if (!flow) return { met: false, detail: 'This step received nothing from an issuer.' };
		if (flow.transport !== 'oid4vci')
			return { met: false, detail: 'This step did not receive over OID4VCI.' };
		if (flow.diVpSigningAlgs.length === 0) {
			return {
				met: false,
				detail: '`proof_signing_alg_values_supported` is absent for the `di_vp` proof type.'
			};
		}
		return flow.diVpSigningAlgInBundle
			? {
					met: true,
					detail: `Your \`di_vp\` signing algorithms include a supported cryptosuite (${flow.diVpSigningAlgs.join(', ')}).`
				}
			: {
					met: false,
					detail: `Your \`di_vp\` signing algorithms (${flow.diVpSigningAlgs.join(', ')}) list none of the data-integrity-cryptosuites bundle, so we cannot sign a key proof you would accept.`
				};
	}
};

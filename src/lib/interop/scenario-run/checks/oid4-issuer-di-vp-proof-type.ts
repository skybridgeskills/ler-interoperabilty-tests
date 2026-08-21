import type { AutomaticCheck } from '../automatic-checks.js';
import { issuerFlowForStep } from '../evidence.js';

/**
 * Your issuer metadata advertises a `di_vp` key-proof type. Ported 1:1 from the
 * issuer engine's `di-vp-proof-type` row; the message names what was actually
 * advertised, so a JWT-only issuer sees why.
 */
export const oid4IssuerDiVpProofType: AutomaticCheck = {
	id: 'oid4-issuer-di-vp-proof-type',
	summary: 'Your issuer metadata advertises a `di_vp` key-proof type.',
	run: ({ stepId, evidence }) => {
		const flow = issuerFlowForStep(evidence, stepId);
		if (!flow) return { met: false, detail: 'This step received nothing from an issuer.' };
		if (flow.transport !== 'oid4vci')
			return { met: false, detail: 'This step did not receive over OID4VCI.' };
		return flow.diVpOffered
			? { met: true, detail: 'Your issuer metadata advertises a `di_vp` key-proof type.' }
			: {
					met: false,
					detail: `Your issuer metadata advertises no \`di_vp\` proof type (we saw: ${flow.proofTypesOffered.join(', ') || 'none'}).`
				};
	}
};

import type { AutomaticCheck } from '../automatic-checks.js';
import { issuerFlowForStep } from '../evidence.js';

/**
 * The credential your issuer delivered is bound to the DID the suite
 * authenticated with. Ported 1:1 from the `binds-verified-holder` row of **both**
 * live issuer engines.
 *
 * Deliberately transport-agnostic in name and registered once: it reads
 * `holderDid` and `subjectId`, two fields present on both live summary variants,
 * so VCALM and OID4VCI share it. The direct paste intake has no exchange and
 * therefore no holder binding to check — that scenario does not name it.
 */
export const issuerBindsHolderDid: AutomaticCheck = {
	id: 'issuer-binds-holder-did',
	summary: 'The delivered credential is bound to the holder DID we authenticated with.',
	run: ({ stepId, evidence }) => {
		const flow = issuerFlowForStep(evidence, stepId);
		if (!flow) return { met: false, detail: 'This step received nothing from an issuer.' };
		if (flow.transport === 'direct') {
			return {
				met: false,
				detail: 'A pasted credential has no exchange, so there is no holder binding to check.'
			};
		}
		if (!flow.holderDid) {
			return {
				met: false,
				detail: 'The exchange never reached the point of authenticating a DID.'
			};
		}
		if (flow.subjectId === flow.holderDid) {
			return { met: true, detail: 'The credential is bound to the holder DID we authenticated.' };
		}
		return {
			met: false,
			detail: `\`credentialSubject.id\` (${flow.subjectId ?? 'missing'}) does not match the holder DID we authenticated (${flow.holderDid}).`
		};
	}
};

import type { AutomaticCheck } from '../automatic-checks.js';
import { issuerFlowForStep } from '../evidence.js';

/**
 * The credential offer led to reachable credential-issuer metadata naming a
 * credential endpoint. Ported 1:1 from the issuer engine's `metadata-endpoint`
 * row — the entry the whole OID4VCI flow depends on.
 */
export const oid4IssuerMetadataEndpoint: AutomaticCheck = {
	id: 'oid4-issuer-metadata-endpoint',
	summary: 'Your credential-issuer metadata is reachable and names a credential endpoint.',
	run: ({ stepId, evidence }) => {
		const flow = issuerFlowForStep(evidence, stepId);
		if (!flow) return { met: false, detail: 'This step received nothing from an issuer.' };
		if (flow.transport !== 'oid4vci')
			return { met: false, detail: 'This step did not receive over OID4VCI.' };
		return flow.metadataReachable
			? {
					met: true,
					detail: 'Your credential-issuer metadata resolved and named a credential endpoint.'
				}
			: {
					met: false,
					detail:
						'Your credential-issuer metadata could not be fetched from the credential offer, or named no credential endpoint.'
				};
	}
};

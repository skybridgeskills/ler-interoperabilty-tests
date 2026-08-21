import type { AutomaticCheck } from '../automatic-checks.js';
import { issuerFlowForStep } from '../evidence.js';

/**
 * The interaction endpoint negotiated TLS 1.2 or above. Ported 1:1 from the
 * issuer engine's `tls` row. An endpoint that was never reached is a **fail**,
 * not an absence — the leaf always writes a summary, and the automatic model has
 * no `n/a`.
 */
export const vcalmIssuerTls: AutomaticCheck = {
	id: 'vcalm-issuer-tls',
	summary: 'Your issuer’s interaction endpoint negotiated TLS 1.2 or above.',
	run: ({ stepId, evidence }) => {
		const flow = issuerFlowForStep(evidence, stepId);
		if (!flow) return { met: false, detail: 'This step received nothing from an issuer.' };
		if (flow.transport !== 'vcalm')
			return { met: false, detail: 'This step did not receive over VCALM.' };
		const tls = flow.interactionTls;
		return tls.atLeastTls12
			? { met: true, detail: `The interaction endpoint negotiated ${tls.protocol ?? 'TLS 1.2+'}.` }
			: {
					met: false,
					detail:
						tls.error ??
						`The interaction endpoint's TLS version (${tls.protocol ?? 'unknown'}) is below TLS 1.2.`
				};
	}
};

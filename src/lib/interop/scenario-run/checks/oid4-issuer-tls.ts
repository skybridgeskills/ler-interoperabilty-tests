import type { AutomaticCheck } from '../automatic-checks.js';
import { issuerFlowForStep } from '../evidence.js';

/**
 * Your issuer host negotiated TLS 1.2 or above.
 *
 * **This one check covers the metadata, token and credential endpoints**, which
 * share the credential issuer's host and are therefore probed once. The engine
 * carried two ids here — `tls` and `tls-credential` — dispatching both to the
 * *same* function over the *same* probed host; two ids for one fact is a
 * duplicate, not coverage, so M11 merges them (`mapping.md` § 3). A host that
 * was never reached is a **fail**, not an absence.
 */
export const oid4IssuerTls: AutomaticCheck = {
	id: 'oid4-issuer-tls',
	summary: 'Your issuer’s endpoints negotiated TLS 1.2 or above.',
	run: ({ stepId, evidence }) => {
		const flow = issuerFlowForStep(evidence, stepId);
		if (!flow) return { met: false, detail: 'This step received nothing from an issuer.' };
		if (flow.transport !== 'oid4vci')
			return { met: false, detail: 'This step did not receive over OID4VCI.' };
		const tls = flow.issuerTls;
		return tls.atLeastTls12
			? {
					met: true,
					detail: `Your issuer host negotiated ${tls.protocol ?? 'TLS 1.2+'} — the metadata, token and credential endpoints share it.`
				}
			: {
					met: false,
					detail:
						tls.error ??
						`Your issuer host's TLS version (${tls.protocol ?? 'unknown'}) is below TLS 1.2. The metadata, token and credential endpoints share this host.`
				};
	}
};

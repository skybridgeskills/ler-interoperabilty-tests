import type { AutomaticCheck } from '../automatic-checks.js';

import { oid4vpStateFor, presentedVpFor } from './presented-vp.js';

/**
 * The wallet delivered a presentation to the verifier.
 *
 * Ported from the wallet-runner's `oid4.wallet.credential-presentation.vp-delivered`.
 * Two branches, as it had: on OID4VP the transport records `direct_post` arrival
 * under `variables.oid4vp.responseReceived`; on VCALM there is no such flag, so a
 * VP echoed into `results.default` is the delivery.
 *
 * This row also absorbs four checklist rows that cannot fail independently of it
 * — `accept-unsigned-request`, `parse-request` (oid4) and `interaction-url-support`,
 * `initiate-exchange`, `process-request` (vcalm). The suite mints only an
 * unsigned `redirect_uri` request, so a matching VP arriving *is* the proof that
 * the request was accepted, parsed and answered. `mapping.md` §§ 3–4 records it.
 *
 * The engine's `n/a` "no delivery observed yet" branch resolves to **fail**: a
 * step only settles once its exchange is terminal, so "not yet" cannot happen on
 * a scored run.
 */
export const walletVpDelivered: AutomaticCheck = {
	id: 'wallet-vp-delivered',
	summary: 'The wallet delivered a presentation to the verifier.',
	run: ({ stepId, evidence }) => {
		const oid4vp = oid4vpStateFor(evidence, stepId);
		if (oid4vp) {
			return oid4vp.responseReceived
				? { met: true, detail: 'The `vp_token` was delivered via `direct_post`.' }
				: {
						met: false,
						detail: 'No `vp_token` delivery was recorded (`responseReceived` is false).'
					};
		}
		return presentedVpFor(evidence, stepId) !== undefined
			? { met: true, detail: 'The presentation reached the verifier’s exchange.' }
			: { met: false, detail: 'No presentation reached the verifier’s exchange.' };
	}
};

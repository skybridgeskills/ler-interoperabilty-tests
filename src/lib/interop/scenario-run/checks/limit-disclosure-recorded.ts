import type { AutomaticCheck } from '../automatic-checks.js';
import { exchangeVariable } from '../evidence.js';

/**
 * The exchange records the `limit_disclosure` constraint we sent.
 *
 * Presence is the proof, for the reason given in
 * `oid4vp-query-language-recorded`: upstream the variable is `.optional()` with
 * no `.default()` and only this suite sets it.
 *
 * The wording names the harness. Selective disclosure not being asked for is a
 * property of the deployment that built the request, never of the wallet
 * answering it.
 */
export const limitDisclosureRecorded: AutomaticCheck = {
	id: 'limit-disclosure-recorded',
	summary: 'The verifier asked for the selective disclosure this scenario pinned.',
	run: ({ stepId, evidence }) => {
		const value = exchangeVariable(evidence, stepId, 'vprLimitDisclosure');
		return value !== undefined
			? {
					met: true,
					detail: `The exchange records \`limit_disclosure: ${String(value)}\` on the request.`
				}
			: {
					met: false,
					detail:
						'The exchange records no `limit_disclosure` constraint — this deployment may not ' +
						'support it, so the verifier asked for the whole credential.'
				};
	}
};

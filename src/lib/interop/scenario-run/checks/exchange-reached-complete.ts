import type { AutomaticCheck } from '../automatic-checks.js';
import { exchangeForStep } from '../evidence.js';

/**
 * The exchange this step drove settled to `complete`.
 *
 * **This says delivery succeeded, and nothing more.** When a wallet is offered a
 * tampered or expired credential the VC-API POST still returns 200 and the
 * exchange still reaches `complete`; the wallet refuses it privately, after our
 * last observation point. So a passing result here is compatible with the wallet
 * having thrown the credential away — which is exactly why the requirements that
 * matter in a discrimination scenario are attested.
 */
export const exchangeReachedComplete: AutomaticCheck = {
	id: 'exchange-reached-complete',
	summary: 'The exchange settled to `complete` — delivery succeeded.',
	run: ({ stepId, evidence }) => {
		const exchange = exchangeForStep(evidence, stepId);
		if (!exchange) return { met: false, detail: 'This step drove no exchange.' };
		if (exchange.state === 'complete') return { met: true, detail: 'The exchange completed.' };
		return { met: false, detail: `The exchange ended in state "${exchange.state}".` };
	}
};

import type { AutomaticCheck } from '../automatic-checks.js';
import { exchangeForStep } from '../evidence.js';

/**
 * The wallet engaged with the offer at all.
 *
 * **Deliberately weak, and it must stay weak.** The wire cannot distinguish
 * "refused after parsing" from "crashed on open" from "parsed and stored" — all
 * three look identical from here. This check answers only "did something on the
 * other end pick the offer up", which is the difference between a wallet that
 * ignored a QR code and one that acted on it. What the wallet then *did* is an
 * attested question, because only its operator can see the answer.
 *
 * OID4VCI never flips the exchange to `active`, so its progress is read from
 * `variables.oid4vci`; VCALM moves the state machine instead. Either signal
 * counts.
 */
export const offerWasFetched: AutomaticCheck = {
	id: 'offer-was-fetched',
	summary: 'Something on the other end picked the offer up.',
	run: ({ stepId, evidence }) => {
		const exchange = exchangeForStep(evidence, stepId);
		if (!exchange) return { met: false, detail: 'This step drove no exchange.' };

		if (exchange.state === 'active' || exchange.state === 'complete') {
			return { met: true, detail: `The exchange reached "${exchange.state}".` };
		}

		const oid4vci = exchange.variables?.oid4vci;
		if (oid4vci && typeof oid4vci === 'object' && Object.keys(oid4vci).length > 0) {
			return { met: true, detail: 'The wallet fetched the OID4VCI credential offer.' };
		}

		return { met: false, detail: 'Nothing ever fetched the offer.' };
	}
};

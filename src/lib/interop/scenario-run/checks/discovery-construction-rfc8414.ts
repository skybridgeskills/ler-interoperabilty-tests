import type { AutomaticCheck } from '../automatic-checks.js';
import { exchangeForStep } from '../evidence.js';

/**
 * The wallet built its metadata URL the way RFC 8414 §3.1 specifies.
 *
 * **Wallet-borne, so observed rather than pinned.** The transaction service
 * serves *both* constructions and discriminates on neither, which means the
 * wallet's choice is the whole measurement — nothing the suite sends can steer
 * it. The service records each election onto the exchange as it happens.
 *
 * **Scores the array, not a value.** The elections are ordered and de-duplicated
 * upstream on purpose: "tried both" and "took the concatenated form" are
 * different observations, and a wallet that tried the specified form found it.
 * So any election naming `rfc8414-path-suffix` passes, including a wallet that
 * fetched both.
 *
 * **SHOULD, not MUST.** The service serves both, so a wallet with this bug
 * completes the flow here and against every similarly permissive issuer. It is a
 * **portability defect**: the next verifier implementing only §3.1 will 404 the
 * fetch and the wallet will abandon before it ever requests a credential.
 */
export const discoveryConstructionRfc8414: AutomaticCheck = {
	id: 'discovery-construction-rfc8414',
	summary: 'The wallet built its metadata URL the way RFC 8414 §3.1 specifies.',
	run: ({ stepId, evidence }) => {
		const elections = exchangeForStep(evidence, stepId)?.discoveryElections;
		if (!Array.isArray(elections) || elections.length === 0) {
			return {
				met: false,
				detail:
					'No metadata discovery was observed on this exchange — nothing recorded which ' +
					'well-known construction was used, so this deployment may not record it.'
			};
		}
		return elections.some((e) => e?.construction === 'rfc8414-path-suffix')
			? {
					met: true,
					detail:
						'Your wallet fetched the well-known document at the RFC 8414 §3.1 location, ' +
						'with the well-known segment placed after the host.'
				}
			: {
					met: false,
					// Naming both URLs concretely, because the difference is easy to
					// misread as a typo rather than a construction.
					detail:
						'Your wallet fetched `…/exchanges/abc123/.well-known/openid-credential-issuer`, ' +
						'appending the well-known segment to the issuer identifier. RFC 8414 §3.1 places ' +
						'it after the host: ' +
						'`…/.well-known/openid-credential-issuer/workflows/claim/exchanges/abc123`. ' +
						'We serve both, so this run completed — a verifier that serves only the ' +
						'specified form will fail discovery.'
				};
	}
};

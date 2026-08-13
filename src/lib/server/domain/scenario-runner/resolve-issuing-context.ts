import type { CannotServe, IssuingIntent } from '$lib/interop/scenarios/index.js';

import type { ExchangeRunnerConfig } from '../exchange-runner/exchange-runner-config.js';

export type { CannotServe };

/** The tenant identity and crypto axis an exchange will actually be minted under. */
export type IssuingContext =
	| {
			ok: true;
			tenantName: string;
			tenantToken: string;
			cryptosuite: string;
			didMethod: string;
	  }
	| { ok: false; reason: CannotServe };

/**
 * Resolve a scenario's issuing intent against what this deployment can serve.
 *
 * **Absent intent means elective**: the deployment's own tenant answers, and it
 * always can. Election already exists upstream — the transaction service ranks
 * issuer instances by the wallet's advertised suites — so a scenario that does
 * not care simply omits the intent and lets that happen.
 *
 * **Present intent means pinned**, and resolves only if this deployment's
 * advertised pair matches.
 *
 * This function is the seam, and it is deliberately the *whole* seam. Today it
 * answers from one tenant, because cryptosuite and DID method are deployment
 * configuration — they ride the tenant, and this suite holds exactly one token.
 * When the suite grows a `(cryptosuite, didMethod) → tenant` map, or when a
 * transaction-service API takes over the choice, only this function changes;
 * **no scenario is touched**. That is the entire reason it exists rather than
 * the caller reading config directly.
 */
export function resolveIssuingContext(
	config: ExchangeRunnerConfig,
	intent?: IssuingIntent
): IssuingContext {
	const served = {
		tenantName: config.tenantName,
		tenantToken: config.tenantToken,
		cryptosuite: config.cryptosuite,
		didMethod: config.didMethod
	};

	if (!intent) return { ok: true, ...served };

	if (intent.cryptosuite !== served.cryptosuite) {
		return {
			ok: false,
			reason: {
				kind: 'cryptosuite-unavailable',
				requested: intent.cryptosuite,
				available: [served.cryptosuite]
			}
		};
	}

	if (intent.didMethod !== served.didMethod) {
		return {
			ok: false,
			reason: {
				kind: 'did-method-unavailable',
				requested: intent.didMethod,
				available: [served.didMethod]
			}
		};
	}

	return { ok: true, ...served };
}

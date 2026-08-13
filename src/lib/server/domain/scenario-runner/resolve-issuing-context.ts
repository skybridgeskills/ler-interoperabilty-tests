import type { IssuingIntent } from '$lib/interop/scenarios/index.js';

import type { ExchangeRunnerConfig } from '../exchange-runner/exchange-runner-config.js';

/**
 * Why a deployment cannot serve a pinned `(cryptosuite, didMethod)` pair.
 *
 * A typed reason rather than a message, because the UI renders the affected
 * scenario **disabled with the reason shown** — and, critically, **still counts
 * its requirements in the completion denominator**. A shrinking denominator
 * would let two deployments issue badges that look identical and mean different
 * things, so an unservable combination blocks the badge instead of quietly
 * making it easier.
 */
export type CannotServe =
	| { kind: 'cryptosuite-unavailable'; requested: string; available: string[] }
	| { kind: 'did-method-unavailable'; requested: string; available: string[] };

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

/** Human-readable form of a {@link CannotServe}, for API bodies and disabled-state copy. */
export function cannotServeMessage(reason: CannotServe): string {
	const axis = reason.kind === 'cryptosuite-unavailable' ? 'cryptosuite' : 'DID method';
	return `This deployment cannot issue with ${axis} "${reason.requested}". It serves: ${reason.available.join(', ')}.`;
}

import type { CannotServe, IssuingIntent } from '$lib/interop/scenarios/index.js';

import type {
	ExchangeRunnerConfig,
	IssuingTenant
} from '../exchange-runner/exchange-runner-config.js';

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
 * This function is the seam, and it is deliberately the *whole* seam. It answers
 * from the deployment's **tenant map**, because a cryptosuite is not something a
 * caller can request: the transaction service picks its issuer instance at claim
 * time by ranking the tenant's instances against the cryptosuites the *wallet*
 * advertised, so the only way to pin one is to mint under a tenant that offers
 * that suite and no other. If a transaction-service API ever takes over the
 * choice, only this function changes; **no scenario is touched**. That is the
 * entire reason it exists rather than the caller reading config directly.
 *
 * A deployment that configures one tenant is the ordinary case and is fully
 * supported: its elective scenarios all run, and its pinned ones render disabled
 * rather than silently minting the wrong suite.
 */
export function resolveIssuingContext(
	config: ExchangeRunnerConfig,
	intent?: IssuingIntent
): IssuingContext {
	const tenants = tenantsOf(config);

	// Absent intent is elective: the deployment's own default tenant answers, and
	// it always can. Election already exists upstream — the transaction service
	// ranks issuer instances by the wallet's advertised suites.
	if (!intent) return served(tenants[0]);

	const match = tenants.find(
		(t) => t.cryptosuite === intent.cryptosuite && t.didMethod === intent.didMethod
	);
	if (match) return served(match);

	// Which axis to blame. A deployment may serve the requested cryptosuite under
	// a different DID method, and naming the wrong axis would send an operator
	// looking at the wrong piece of configuration.
	if (!tenants.some((t) => t.cryptosuite === intent.cryptosuite)) {
		return {
			ok: false,
			reason: {
				kind: 'cryptosuite-unavailable',
				requested: intent.cryptosuite,
				available: unique(tenants.map((t) => t.cryptosuite))
			}
		};
	}

	return {
		ok: false,
		reason: {
			kind: 'did-method-unavailable',
			requested: intent.didMethod,
			available: unique(
				tenants.filter((t) => t.cryptosuite === intent.cryptosuite).map((t) => t.didMethod)
			)
		}
	};
}

/**
 * The deployment's tenant list, always non-empty.
 *
 * `config.tenants` is optional so a hand-built config — every fake and test
 * context — need not restate what the top-level fields already say. Absent means
 * one tenant: this one. Reading it in exactly one place is what keeps that
 * fallback from becoming a second source of truth.
 */
function tenantsOf(config: ExchangeRunnerConfig): IssuingTenant[] {
	if (config.tenants?.length) return config.tenants;
	return [
		{
			name: config.tenantName,
			token: config.tenantToken,
			cryptosuite: config.cryptosuite,
			didMethod: config.didMethod
		}
	];
}

function served(tenant: IssuingTenant): IssuingContext {
	return {
		ok: true,
		tenantName: tenant.name,
		tenantToken: tenant.token,
		cryptosuite: tenant.cryptosuite,
		didMethod: tenant.didMethod
	};
}

/** Distinct values, in configuration order — the list a `CannotServe` reason renders. */
function unique(values: string[]): string[] {
	return [...new Set(values)];
}

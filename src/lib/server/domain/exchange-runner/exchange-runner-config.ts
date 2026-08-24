import { z } from 'zod';

import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * One tenant this deployment can mint under, and the `(cryptosuite, didMethod)`
 * pair it advertises.
 *
 * **A list, because pinning a cryptosuite can only be a tenant swap.** The
 * transaction service picks its issuer instance at *claim* time, ranking the
 * tenant's instances against the cryptosuites the **wallet** advertised
 * (`selectIssuerInstance`); the caller creating the exchange has no say. So the
 * only way a scenario can pin a suite is to mint under a tenant whose issuer
 * instances declare that suite and no other — which is exactly what
 * `IssuingIntent`'s docstring predicted when it said a scenario "can only vary
 * them by choosing a different tenant".
 *
 * Cheap on this side, because a tenant is carried entirely by the Bearer token:
 * `tenantName` never appears in a transaction-service URL.
 */
export const IssuingTenant = ZodFactory(
	z.object({
		name: z.string().min(1),
		token: z.string(),
		/**
		 * What this tenant **advertises**, not what a caller requests. Both are
		 * fixed upstream — `TENANT_ISSUER_<n>_CRYPTOSUITE_<T>` on the transaction
		 * service, and `did:web` when `TENANT_DID_URL_<T>` is set on the signing
		 * service, otherwise `did:key`. Recorded here so `resolveIssuingContext`
		 * can answer whether a pinned scenario is servable without guessing.
		 */
		cryptosuite: z.string().min(1),
		didMethod: z.string().min(1)
	})
);
export type IssuingTenant = ReturnType<typeof IssuingTenant>;

/**
 * Runtime configuration the suite reads to talk to the local DCC
 * transaction service. Server-only — never imported into client code.
 */
export const ExchangeRunnerConfig = ZodFactory(
	z.object({
		enabled: z.boolean(),
		transactionServiceUrl: z.string().url(),
		tenantName: z.string(),
		tenantToken: z.string(),
		exchangeHost: z.string().url(),
		/**
		 * What the **default** tenant advertises — the first entry of
		 * {@link ExchangeRunnerConfig.tenants}, kept as top-level fields so a
		 * single-tenant deployment reads exactly as it did before the list existed.
		 */
		cryptosuite: z.string().default('eddsa-rdfc-2022'),
		didMethod: z.string().default('key'),
		/**
		 * Every tenant this deployment can mint under, default first.
		 *
		 * **Optional, and absent means "just the default one".** `resolveIssuingContext`
		 * reads it through `tenantsOf`, which falls back to the top-level
		 * `tenantName`/`tenantToken`/`cryptosuite`/`didMethod` — so a config built by
		 * hand (every fake and test context) needs no tenant list, and a deployment
		 * that sets no new environment variables behaves exactly as it did before
		 * this field existed.
		 *
		 * A deployment with one tenant runs every elective scenario, and renders
		 * every scenario pinning something it does not advertise as disabled with a
		 * typed reason while **keeping its requirements in the completion
		 * denominator**. That is the deliberate trade: a shrinking denominator would
		 * let two deployments issue badges that look identical and mean different
		 * things, so the badge is blocked instead.
		 */
		tenants: z.array(IssuingTenant.schema).optional(),
		/**
		 * The public origin the badge `achievement.id`/`criteria.id` resolve to.
		 * This is **this app's own** origin (where `/badges/[slug]` is served), NOT
		 * the transaction service (`exchangeHost` is wrong for badge ids). Defaults
		 * to the SvelteKit dev origin.
		 */
		badgeRootUrl: z.string().url().default('http://localhost:5173')
	})
);
export type ExchangeRunnerConfig = ReturnType<typeof ExchangeRunnerConfig>;

const truthy = (v: unknown) => typeof v === 'string' && /^(true|1|yes)$/i.test(v.trim());

/** Parse env vars into the typed config. Defaults match `.env.example`. */
export function parseExchangeRunnerConfig(env: Record<string, unknown>): ExchangeRunnerConfig {
	const transactionServiceUrl =
		(typeof env.TRANSACTION_SERVICE_URL === 'string' && env.TRANSACTION_SERVICE_URL) ||
		'http://localhost:4004';
	const exchangeHost =
		(typeof env.DEFAULT_EXCHANGE_HOST === 'string' && env.DEFAULT_EXCHANGE_HOST) ||
		transactionServiceUrl;

	const defaultTenant = IssuingTenant({
		name: str(env.TRANSACTION_SERVICE_TENANT_NAME) ?? 'default',
		token: str(env.TRANSACTION_SERVICE_TENANT_TOKEN) ?? '',
		cryptosuite: str(env.TRANSACTION_SERVICE_TENANT_CRYPTOSUITE) ?? 'eddsa-rdfc-2022',
		didMethod: str(env.TRANSACTION_SERVICE_TENANT_DID_METHOD) ?? 'key'
	});

	return ExchangeRunnerConfig({
		enabled: truthy(env.EXCHANGE_RUNNER_ENABLED),
		transactionServiceUrl,
		tenantName: defaultTenant.name,
		tenantToken: defaultTenant.token,
		exchangeHost,
		cryptosuite: defaultTenant.cryptosuite,
		didMethod: defaultTenant.didMethod,
		tenants: [defaultTenant, ...additionalTenants(env)],
		badgeRootUrl:
			(typeof env.BADGE_ROOT_URL === 'string' && env.BADGE_ROOT_URL) || 'http://localhost:5173'
	});
}

/** A non-empty string env var, or `undefined`. */
function str(value: unknown): string | undefined {
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Tenants beyond the default, read from an indexed family starting at 2:
 *
 * ```
 * TRANSACTION_SERVICE_TENANT_2_NAME=ecdsa
 * TRANSACTION_SERVICE_TENANT_2_TOKEN=…
 * TRANSACTION_SERVICE_TENANT_2_CRYPTOSUITE=ecdsa-rdfc-2019
 * TRANSACTION_SERVICE_TENANT_2_DID_METHOD=key
 * ```
 *
 * Indexed rather than a JSON blob so it matches the shape of the upstream
 * configuration it mirrors (`TENANT_ISSUER_<n>_…_<TENANT>`), and so a missing
 * value is a missing variable rather than a parse error. Scanning stops at the
 * first absent `_NAME`, upstream's own convention.
 *
 * A tenant named but given **no token** is dropped: minting under an empty
 * Bearer token would fail at the service with an opaque `unauthorized`, and a
 * scenario pinned to it should read as *unservable* — which is a legible
 * disabled row — rather than as a broken run.
 */
function additionalTenants(env: Record<string, unknown>): IssuingTenant[] {
	const tenants: IssuingTenant[] = [];
	for (let n = 2; ; n++) {
		const name = str(env[`TRANSACTION_SERVICE_TENANT_${n}_NAME`]);
		if (!name) break;
		const token = str(env[`TRANSACTION_SERVICE_TENANT_${n}_TOKEN`]);
		if (!token) continue;
		tenants.push(
			IssuingTenant({
				name,
				token,
				cryptosuite: str(env[`TRANSACTION_SERVICE_TENANT_${n}_CRYPTOSUITE`]) ?? 'eddsa-rdfc-2022',
				didMethod: str(env[`TRANSACTION_SERVICE_TENANT_${n}_DID_METHOD`]) ?? 'key'
			})
		);
	}
	return tenants;
}

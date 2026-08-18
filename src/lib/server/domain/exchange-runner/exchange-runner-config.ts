import { z } from 'zod';

import { ZodFactory } from '$lib/util/zod-factory.js';

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
		 * What this deployment's tenant **advertises**, not what a caller
		 * requests. Cryptosuite and DID method are deployment configuration on
		 * the signing service (`TENANT_CRYPTOSUITE_<T>`, and `did:web` when
		 * `TENANT_DID_URL_<T>` is set, otherwise `did:key`), so a scenario can
		 * only vary them by choosing a different tenant — and this suite holds
		 * one. Recorded here so `resolveIssuingContext` can answer whether a
		 * pinned scenario is servable without guessing.
		 */
		cryptosuite: z.string().default('eddsa-rdfc-2022'),
		didMethod: z.string().default('key'),
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

	return ExchangeRunnerConfig({
		enabled: truthy(env.EXCHANGE_RUNNER_ENABLED),
		transactionServiceUrl,
		tenantName:
			(typeof env.TRANSACTION_SERVICE_TENANT_NAME === 'string' &&
				env.TRANSACTION_SERVICE_TENANT_NAME) ||
			'default',
		tenantToken:
			(typeof env.TRANSACTION_SERVICE_TENANT_TOKEN === 'string' &&
				env.TRANSACTION_SERVICE_TENANT_TOKEN) ||
			'',
		exchangeHost,
		cryptosuite:
			(typeof env.TRANSACTION_SERVICE_TENANT_CRYPTOSUITE === 'string' &&
				env.TRANSACTION_SERVICE_TENANT_CRYPTOSUITE) ||
			'eddsa-rdfc-2022',
		didMethod:
			(typeof env.TRANSACTION_SERVICE_TENANT_DID_METHOD === 'string' &&
				env.TRANSACTION_SERVICE_TENANT_DID_METHOD) ||
			'key',
		badgeRootUrl:
			(typeof env.BADGE_ROOT_URL === 'string' && env.BADGE_ROOT_URL) || 'http://localhost:5173'
	});
}

import type { ExchangeRunnerConfig } from './exchange-runner-config.js';
import type {
	CreateIssuanceExchangeRequest,
	CreateVerificationExchangeRequest
} from './transaction-service-client.js';

/**
 * Build the request body for `POST /workflows/claim/exchanges`. Mirrors the
 * transaction service's `exchangeCreateSchemaClaim`: `tenantName`/`exchangeHost`
 * come from config, and `retrievalId` plus the credential document come from the
 * caller.
 *
 * The workflow's credential template is `{{{vc}}}` — a Handlebars
 * **triple-stache** — so the string sent here *is* the credential, unescaped.
 * The services overwrite only `credentialSubject.id`, `credentialStatus`,
 * `issuer.id` and `proof`; everything else the caller authors survives.
 *
 * Two optional variables ride along:
 *
 * - **`tamper`** corrupts the credential *after* signing and before delivery,
 *   which is the only way to produce a proof and payload that genuinely
 *   disagree. `proof` flips one character mid-`proofValue`; `claim` alters a
 *   signature-covered value and leaves the proof intact.
 * - **`exchangeIdPrefix`** is the caller's correlation tag. Note that it is a
 *   **sibling of `variables`, not a member of it** — it rides into the minted
 *   `exchangeId` and therefore appears on the wire, in the exchange journal and
 *   in every evidence filename, which is how a run is found again later. The
 *   exchange itself is evicted at `EXCHANGE_TTL`; the journal is not.
 */
export function issuanceExchangeBody(
	config: ExchangeRunnerConfig,
	req: CreateIssuanceExchangeRequest
) {
	return {
		...(req.exchangeIdPrefix ? { exchangeIdPrefix: req.exchangeIdPrefix } : {}),
		variables: {
			tenantName: config.tenantName,
			exchangeHost: config.exchangeHost,
			retrievalId: req.retrievalId,
			vc: JSON.stringify(req.credential),
			...(req.tamper ? { tamper: req.tamper } : {})
		}
	};
}

/**
 * Build the request body for `POST /workflows/verify/exchanges`. Mirrors the
 * transaction service's `exchangeCreateSchemaVerify`: `tenantName`/`exchangeHost`
 * come from config, the presentation-request fields from the caller. The
 * `challenge` is server-generated, so it is intentionally omitted here.
 * `vprClaims` is a REQUIRED array in the transaction service's
 * `exchangeCreateSchemaVerify` (elements optional, the array is not), so it is
 * always sent, defaulting to `[]`. `trustedIssuers`/`trustedRegistries` are
 * genuinely optional and only sent when present.
 *
 * The three conduct variables are spread **conditionally, never as an explicit
 * `undefined`**. Upstream they are `.optional()` with no `.default()`, and this
 * suite is the only party that sets them — so a variable appears in the stored
 * `exchange.variables` if and only if we sent it and the service knows the
 * field. That is exactly what the `*-recorded` automatic checks read, and an
 * explicit `undefined` would muddy it.
 */
export function verificationExchangeBody(
	config: ExchangeRunnerConfig,
	req: CreateVerificationExchangeRequest
) {
	return {
		variables: {
			tenantName: config.tenantName,
			exchangeHost: config.exchangeHost,
			vprCredentialType: req.vprCredentialType,
			vprContext: req.vprContext,
			vprClaims: req.vprClaims ?? [],
			...(req.trustedIssuers ? { trustedIssuers: req.trustedIssuers } : {}),
			...(req.queryLanguage ? { oid4vpQueryLanguage: req.queryLanguage } : {}),
			...(req.limitDisclosure ? { vprLimitDisclosure: req.limitDisclosure } : {}),
			...(req.advertiseCryptosuites ? { vprAdvertiseCryptosuites: req.advertiseCryptosuites } : {})
		}
	};
}

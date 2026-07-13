import type { ExchangeRunnerConfig } from './exchange-runner-config.js';
import { ob3CredentialTemplate } from './ob3-credential-template.js';
import type {
	CreateIssuanceExchangeRequest,
	CreateVerificationExchangeRequest
} from './transaction-service-client.js';

/**
 * Build the request body for `POST /workflows/claim/exchanges`. Mirrors the
 * transaction service's `exchangeCreateSchemaClaim`: `tenantName`/`exchangeHost`
 * come from config, `retrievalId` from the caller, and `vc` is the bundled
 * unsigned OB3 template the signing service completes at issue time.
 */
export function issuanceExchangeBody(
	config: ExchangeRunnerConfig,
	req: CreateIssuanceExchangeRequest
) {
	return {
		variables: {
			tenantName: config.tenantName,
			exchangeHost: config.exchangeHost,
			retrievalId: req.retrievalId,
			vc: JSON.stringify(ob3CredentialTemplate(req.retrievalId))
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
			...(req.trustedIssuers ? { trustedIssuers: req.trustedIssuers } : {})
		}
	};
}

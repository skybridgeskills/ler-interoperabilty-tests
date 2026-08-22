import { z } from 'zod';

import { ZodFactory } from '$lib/util/zod-factory.js';

import { issuanceExchangeBody, verificationExchangeBody } from './create-bodies.js';
import type { ExchangeRunnerConfig } from './exchange-runner-config.js';

/** Verifiable Presentation Request shape — pass-through to the wallet. */
export const VerifiablePresentationRequest = ZodFactory(z.record(z.string(), z.unknown()));
export type VerifiablePresentationRequest = ReturnType<typeof VerifiablePresentationRequest>;

/** Protocols object returned by `POST /workflows/:workflowId/exchanges`. */
export const ExchangeProtocols = ZodFactory(
	z.object({
		iu: z.string().url(),
		vcapi: z.string().url(),
		lcw: z.string().url().optional(),
		/**
		 * OID4VCI 1.0 deep link
		 * (`openid-credential-offer://?credential_offer_uri=…`). Present
		 * only when the connected transaction-service version supports
		 * the OID4VCI Pre-Authorized Code Flow; older containers omit
		 * this field, in which case the runner UI's protocol selector
		 * falls back to VCALM-only.
		 *
		 * Wire field name is uppercase `OID4VCI` to match the OID4VCI
		 * 1.0 spec name and the prior sveltekit spike's convention.
		 * Schema is plain `z.string()` (not `.url()`) —
		 * `openid-credential-offer://` is a custom URI scheme that some
		 * `.url()` validators reject.
		 */
		OID4VCI: z.string().optional(),
		/**
		 * OID4VP 1.0 authorization request deep link
		 * (`openid4vp://?client_id=…&request_uri=…`). Present only on a
		 * `verify` exchange when the connected transaction-service version
		 * supports OID4VP; older containers omit it, in which case the oid4
		 * presentation page surfaces a friendly "not returned" error.
		 *
		 * Wire field name is uppercase `OID4VP` to match the spec name and
		 * the sibling `OID4VCI` field. Plain `z.string()` (not `.url()`) —
		 * `openid4vp://` is a custom URI scheme some `.url()` validators reject.
		 */
		OID4VP: z.string().optional(),
		verifiablePresentationRequest: VerifiablePresentationRequest.schema
	})
);
export type ExchangeProtocols = ReturnType<typeof ExchangeProtocols>;

/**
 * Envelope returned by `GET /workflows/:workflowId/exchanges/:exchangeId/protocols`.
 *
 * The protocols object itself is byte-identical to the one `POST …/exchanges`
 * returns — the transaction service builds both with the same `getProtocols()`
 * — but the GET wraps it in a `{ protocols }` envelope where the POST returns it
 * bare. {@link TransactionServiceClient.getProtocols} unwraps it so both paths
 * hand callers the same {@link CreateExchangeResult}.
 */
export const ExchangeProtocolsEnvelope = ZodFactory(
	z.object({ protocols: ExchangeProtocols.schema })
);
export type ExchangeProtocolsEnvelope = ReturnType<typeof ExchangeProtocolsEnvelope>;

/** Exchange state from `GET /workflows/:workflowId/exchanges/:exchangeId`. */
export const ExchangeState = ZodFactory(z.enum(['pending', 'active', 'complete', 'invalid']));
export type ExchangeState = ReturnType<typeof ExchangeState>;

/** Which transaction-service workflow an exchange belongs to. */
export const WorkflowId = ZodFactory(z.enum(['claim', 'verify']));
export type WorkflowId = ReturnType<typeof WorkflowId>;

/**
 * A single DCQL-style claim constraint on a verify presentation request.
 * Mirrors the transaction service's `verifyWorkflow` claim shape.
 */
export const DcqlClaim = ZodFactory(
	z.object({
		id: z.string().optional(),
		path: z.array(z.string()),
		values: z.array(z.string()).optional()
	})
);
export type DcqlClaim = ReturnType<typeof DcqlClaim>;

export const ExchangeRecord = ZodFactory(
	z.object({
		exchangeId: z.string(),
		workflowId: z.string().optional(),
		state: ExchangeState.schema,
		variables: z.record(z.string(), z.unknown()).optional(),
		expires: z.string().optional()
	})
);
export type ExchangeRecord = ReturnType<typeof ExchangeRecord>;

/** Inputs the suite passes when initiating an issuance (`claim`) exchange. */
export type CreateIssuanceExchangeRequest = {
	retrievalId: string;
	/**
	 * The unsigned credential document to issue, already built from a recipe.
	 * Sent as the `vc` variable, which the workflow interpolates with a
	 * triple-stache — so this document *is* the credential.
	 */
	credential: Record<string, unknown>;
	/** Corrupt the credential after signing, before delivery. */
	tamper?: 'proof' | 'claim';
	/**
	 * Correlation tag that rides into the minted `exchangeId` and the exchange
	 * journal. A sibling of `variables` on the wire, not one of them.
	 */
	exchangeIdPrefix?: string;
	/**
	 * Which tenant to mint under, defaulting to the configured one.
	 *
	 * **This is how a scenario pins a cryptosuite.** The transaction service
	 * chooses its issuer instance at claim time by ranking the tenant's instances
	 * against the cryptosuites the *wallet* advertised, so the exchange creator
	 * cannot request a suite — it can only choose a tenant that offers the one it
	 * wants. `resolveIssuingContext` makes that choice; this carries it. The
	 * tenant travels entirely in the Bearer token, which is why nothing else on
	 * the request changes.
	 */
	tenantToken?: string;
};

/** Inputs the suite passes when initiating a verification (`verify`) exchange. */
export type CreateVerificationExchangeRequest = {
	vprCredentialType: string[];
	vprContext: string[];
	trustedIssuers?: string[];
	vprClaims?: DcqlClaim[];
};

/** Result returned to suite callers. */
export type CreateExchangeResult = {
	exchangeId: string;
	protocols: ExchangeProtocols;
	/** The workflow this exchange was created under; carry it back to `getExchange`. */
	workflowId: WorkflowId;
};

/**
 * Common interface implemented by both the real (HTTP) client and the
 * in-memory fake. Server endpoints depend only on this interface.
 */
export interface TransactionServiceClient {
	createIssuanceExchange(req: CreateIssuanceExchangeRequest): Promise<CreateExchangeResult>;
	createVerificationExchange(req: CreateVerificationExchangeRequest): Promise<CreateExchangeResult>;
	getExchange(workflowId: WorkflowId, exchangeId: string): Promise<ExchangeRecord>;
	/**
	 * Read the protocols of an exchange this suite did not necessarily mint.
	 * Backs attach mode: an exchange minted out-of-band (CLI, another harness)
	 * is adopted by id, and the wallet-facing links come from the service rather
	 * than being derived locally.
	 */
	getProtocols(workflowId: WorkflowId, exchangeId: string): Promise<CreateExchangeResult>;
}

/** Network-layer / API error surfaced from the real client. */
export class TransactionServiceError extends Error {
	constructor(
		public readonly status: number,
		public readonly body: string,
		public readonly code = 'TRANSACTION_SERVICE_ERROR'
	) {
		super(`Transaction service responded ${status}: ${body}`);
		this.name = 'TransactionServiceError';
	}
}

/** Real HTTP client that talks to a running DCC transaction-service container. */
export function RealTransactionServiceClient(
	config: ExchangeRunnerConfig
): TransactionServiceClient {
	/**
	 * Headers for one call. The tenant is carried **entirely** by the Bearer
	 * token — `config.tenantName` never appears in a transaction-service URL — so
	 * minting under a different tenant is a different token and nothing else.
	 * Built per request rather than once at construction for exactly that reason.
	 */
	const headers = (tenantToken: string = config.tenantToken) => ({
		Authorization: `Bearer ${tenantToken}`,
		'Content-Type': 'application/json',
		Accept: 'application/json'
	});

	async function createIssuanceExchange(
		req: CreateIssuanceExchangeRequest
	): Promise<CreateExchangeResult> {
		return postExchange('claim', issuanceExchangeBody(config, req), req.tenantToken);
	}

	async function createVerificationExchange(
		req: CreateVerificationExchangeRequest
	): Promise<CreateExchangeResult> {
		// No tenant override: a verify exchange mints no credential, so it has no
		// cryptosuite to pin and nothing to choose a tenant for.
		return postExchange('verify', verificationExchangeBody(config, req));
	}

	async function postExchange(
		workflowId: WorkflowId,
		body: unknown,
		tenantToken?: string
	): Promise<CreateExchangeResult> {
		const url = `${config.transactionServiceUrl}/workflows/${workflowId}/exchanges`;
		const res = await fetch(url, {
			method: 'POST',
			headers: headers(tenantToken),
			body: JSON.stringify(body)
		});
		if (!res.ok) throw new TransactionServiceError(res.status, await res.text());
		const protocols = ExchangeProtocols(await res.json());
		return { exchangeId: extractExchangeIdFromIu(protocols.iu), protocols, workflowId };
	}

	async function getExchange(workflowId: WorkflowId, exchangeId: string): Promise<ExchangeRecord> {
		const url = `${config.transactionServiceUrl}/workflows/${workflowId}/exchanges/${exchangeId}`;
		const res = await fetch(url, { headers: headers() });
		if (!res.ok) throw new TransactionServiceError(res.status, await res.text());
		return ExchangeRecord(await res.json());
	}

	/**
	 * The service leaves this route unauthenticated (the wallet's own entry
	 * points read it), but we send the default tenant's headers anyway to keep the
	 * client uniform. The `exchangeId` echoed back is the caller's — this endpoint is
	 * addressed by id, so there is nothing to extract from `iu`.
	 */
	async function getProtocols(
		workflowId: WorkflowId,
		exchangeId: string
	): Promise<CreateExchangeResult> {
		const url = `${config.transactionServiceUrl}/workflows/${workflowId}/exchanges/${exchangeId}/protocols`;
		const res = await fetch(url, { headers: headers() });
		if (!res.ok) throw new TransactionServiceError(res.status, await res.text());
		const { protocols } = ExchangeProtocolsEnvelope(await res.json());
		return { exchangeId, protocols, workflowId };
	}

	return { createIssuanceExchange, createVerificationExchange, getExchange, getProtocols };
}

/** Pull the exchange UUID out of an interaction URL like `…/interactions/<id>`. */
function extractExchangeIdFromIu(iu: string): string {
	const url = new URL(iu);
	const segments = url.pathname.split('/').filter(Boolean);
	const last = segments[segments.length - 1];
	if (!last) {
		throw new TransactionServiceError(
			500,
			`Interaction URL had no exchange id: ${iu}`,
			'MALFORMED_INTERACTION_URL'
		);
	}
	return last;
}

import { z } from 'zod';

import { ZodFactory } from '$lib/util/zod-factory.js';

import type { ExchangeRunnerConfig } from './exchange-runner-config.js';
import { ob3CredentialTemplate } from './ob3-credential-template.js';

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
		verifiablePresentationRequest: VerifiablePresentationRequest.schema
	})
);
export type ExchangeProtocols = ReturnType<typeof ExchangeProtocols>;

/** Exchange state from `GET /workflows/:workflowId/exchanges/:exchangeId`. */
export const ExchangeState = ZodFactory(z.enum(['pending', 'active', 'complete', 'invalid']));
export type ExchangeState = ReturnType<typeof ExchangeState>;

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

/** Inputs the suite passes when initiating a new exchange. */
export type CreateExchangeRequest = {
	retrievalId: string;
};

/** Result returned to suite callers. */
export type CreateExchangeResult = {
	exchangeId: string;
	protocols: ExchangeProtocols;
};

/**
 * Common interface implemented by both the real (HTTP) client and the
 * in-memory fake. Server endpoints depend only on this interface.
 */
export interface TransactionServiceClient {
	createExchange(req: CreateExchangeRequest): Promise<CreateExchangeResult>;
	getExchange(exchangeId: string): Promise<ExchangeRecord>;
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
	const baseHeaders = {
		Authorization: `Bearer ${config.tenantToken}`,
		'Content-Type': 'application/json',
		Accept: 'application/json'
	};
	const workflowId = 'claim';

	async function createExchange(req: CreateExchangeRequest): Promise<CreateExchangeResult> {
		const body = {
			variables: {
				tenantName: config.tenantName,
				exchangeHost: config.exchangeHost,
				retrievalId: req.retrievalId,
				vc: JSON.stringify(ob3CredentialTemplate(req.retrievalId))
			}
		};
		const url = `${config.transactionServiceUrl}/workflows/${workflowId}/exchanges`;
		const res = await fetch(url, {
			method: 'POST',
			headers: baseHeaders,
			body: JSON.stringify(body)
		});
		if (!res.ok) throw new TransactionServiceError(res.status, await res.text());
		const protocols = ExchangeProtocols(await res.json());
		return { exchangeId: extractExchangeIdFromIu(protocols.iu), protocols };
	}

	async function getExchange(exchangeId: string): Promise<ExchangeRecord> {
		const url = `${config.transactionServiceUrl}/workflows/${workflowId}/exchanges/${exchangeId}`;
		const res = await fetch(url, { headers: baseHeaders });
		if (!res.ok) throw new TransactionServiceError(res.status, await res.text());
		return ExchangeRecord(await res.json());
	}

	return { createExchange, getExchange };
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

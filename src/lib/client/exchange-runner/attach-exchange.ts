import type { RunnerWorkflowId } from '$lib/interop/runner-state.js';

/**
 * Which wire field of the protocols object a runnable page presents. Uppercase
 * `OID4VCI` / `OID4VP` are the spec-cased wire names; `iu` is the VCALM
 * interaction URL.
 */
export type AttachProtocolLink = 'iu' | 'OID4VCI' | 'OID4VP';

/** Error affordance shape both runnable wallet pages already render. */
export type AttachError = { message: string; hint?: string };

export type AttachExchangeResult =
	| { ok: true; exchangeId: string; interactionUrl: string }
	| { ok: false; error: AttachError };

/**
 * Minimal structural view of the adopt endpoint's body. Kept local (rather than
 * importing the server domain's `ExchangeProtocols`) so this module stays
 * client-safe.
 */
type AttachResponseBody = {
	exchangeId?: string;
	protocols?: Partial<Record<AttachProtocolLink, string>>;
};

const SERVICES_HINT = 'Run `pnpm turbo dev:full` to start the local DCC dependency services.';

/**
 * Copy for "the exchange exists but carries no link for this profile". Almost
 * always a version mismatch: an exchange minted against a transaction service
 * that predates the protocol, or minted under the other workflow.
 */
const MISSING_LINK: Record<AttachProtocolLink, AttachError> = {
	iu: {
		message: 'The transaction service did not return an interaction URL for this exchange.',
		hint: 'Check the exchangeId and workflow in the page URL against the exchange the CLI minted.'
	},
	OID4VCI: {
		message: 'The transaction service did not return an OID4VCI credential offer.',
		hint: 'Point TRANSACTION_SERVICE_URL at an OID4VCI-capable transaction service (e.g. the local feature/oid4vp build).'
	},
	OID4VP: {
		message: 'The transaction service did not return an OID4VP request.',
		hint: 'Point TRANSACTION_SERVICE_URL at an OID4VP-capable transaction service (the local feature/oid4vp build).'
	}
};

/**
 * Adopt an externally-minted exchange: fetch its protocols by id and pick the
 * single link this profile presents.
 *
 * Attach mode never mints — the exchange comes from the probe CLI, and this
 * function only reads. Failures come back as the `{ message, hint }` the pages'
 * existing error affordance renders, so no caller needs its own error copy.
 */
export async function attachExchange({
	exchangeId,
	workflow,
	link
}: {
	exchangeId: string;
	workflow: RunnerWorkflowId;
	link: AttachProtocolLink;
}): Promise<AttachExchangeResult> {
	const url = `/api/exchange-runner/${encodeURIComponent(exchangeId)}/protocols?workflow=${workflow}`;

	let res: Response;
	try {
		res = await fetch(url, { headers: { Accept: 'application/json' } });
	} catch (e) {
		return {
			ok: false,
			error: { message: e instanceof Error ? e.message : String(e), hint: SERVICES_HINT }
		};
	}

	if (!res.ok) {
		const body = (await res.json().catch(() => ({}))) as Partial<AttachError>;
		return {
			ok: false,
			error: {
				message: body.message ?? `Attach responded ${res.status}`,
				hint: body.hint ?? SERVICES_HINT
			}
		};
	}

	const body = (await res.json()) as AttachResponseBody;
	const interactionUrl = body.protocols?.[link];
	if (!interactionUrl) return { ok: false, error: MISSING_LINK[link] };

	return { ok: true, exchangeId: body.exchangeId ?? exchangeId, interactionUrl };
}

import { json } from '@sveltejs/kit';

import { appContext } from '$lib/server/app-context.js';

import { InspectRequest, InspectResponse, RequestSummary } from './inspect-schemas.js';

function errorResponse(message: string, hint?: string, status = 400): Response {
	return json({ error: { message, ...(hint ? { hint } : {}) } }, { status });
}

/**
 * Run the automated oid4 verifier floor over one pasted authorization
 * request and return `{ outcomes, activity, requestSummary }`. Always 200
 * when the body is well-formed — a bad *verifier* request is an honest
 * `fail`/`n/a` outcome set, not an HTTP error. 400 covers a malformed body
 * only; error shape matches the other verifier-runner routes.
 */
export const POST = async ({ request }: { request: Request }) => {
	const { verifierRunner, logger } = appContext();

	let raw: unknown;
	try {
		raw = await request.json();
	} catch {
		return errorResponse(
			'Request body is not valid JSON.',
			'Send a JSON object with `input` and an optional `cryptosuite`.'
		);
	}

	const parsed = InspectRequest.schema.safeParse(raw);
	if (!parsed.success) {
		return errorResponse('Bad request shape.', parsed.error.message);
	}

	try {
		const result = await verifierRunner.inspectOid4Request(parsed.data);
		const summary =
			result.resolvedRequest && result.form
				? RequestSummary({
						clientId: result.resolvedRequest.client_id,
						responseUri: result.resolvedRequest.response_uri,
						responseMode: result.resolvedRequest.response_mode,
						form: result.form,
						noncePresent: result.resolvedRequest.nonce.length > 0
					})
				: undefined;
		return json(
			InspectResponse({
				outcomes: result.outcomes,
				activity: result.activity,
				...(summary ? { requestSummary: summary } : {})
			})
		);
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		logger.error({ err: message }, 'verifier-runner oid4 inspect failed unexpectedly');
		return errorResponse('Unexpected verifier-runner error.', message, 500);
	}
};

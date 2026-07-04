import { json } from '@sveltejs/kit';

import { appContext } from '$lib/server/app-context.js';
import { PresentInputError } from '$lib/server/domain/verifier-runner/index.js';

import { PresentRequest, PresentResponse } from './present-schemas.js';

function errorResponse(message: string, hint?: string, status = 400): Response {
	return json({ error: { message, ...(hint ? { hint } : {}) } }, { status });
}

/**
 * Present one plan entry's credential to the operator's verifier — fixture
 * generation, signing, and `direct_post` submission all in this one server
 * request — and return `{ evidence, activity }`. A failed submission is honest
 * evidence (`submitted: false`), returned 200; only a malformed authorization
 * request is a 400. Server-only crypto: the holder key never leaves the server.
 */
export const POST = async ({ request }: { request: Request }) => {
	const { verifierRunner, logger } = appContext();

	let raw: unknown;
	try {
		raw = await request.json();
	} catch {
		return errorResponse(
			'Request body is not valid JSON.',
			'Send a JSON object with `entry`, `input`, and an optional `cryptosuite`.'
		);
	}

	const parsed = PresentRequest.schema.safeParse(raw);
	if (!parsed.success) {
		return errorResponse('Bad request shape.', parsed.error.message);
	}

	try {
		const result = await verifierRunner.presentOid4Credential(parsed.data);
		return json(PresentResponse({ evidence: result.evidence, activity: result.activity }));
	} catch (e) {
		if (e instanceof PresentInputError) {
			return errorResponse('The pasted request could not be resolved.', e.message);
		}
		const message = e instanceof Error ? e.message : String(e);
		logger.error({ err: message }, 'verifier-runner oid4 present failed unexpectedly');
		return errorResponse('Unexpected verifier-runner error.', message, 500);
	}
};

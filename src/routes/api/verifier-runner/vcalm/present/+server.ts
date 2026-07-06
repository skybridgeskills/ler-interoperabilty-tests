import { json } from '@sveltejs/kit';

import { appContext } from '$lib/server/app-context.js';
import { PresentInputError } from '$lib/server/domain/verifier-runner/index.js';

import { PresentRequest, PresentResponse } from './present-schemas.js';

function errorResponse(message: string, hint?: string, status = 400): Response {
	return json({ error: { message, ...(hint ? { hint } : {}) } }, { status });
}

/**
 * Present one plan entry's credential to the operator's verifier over a fresh
 * single-use VC-API exchange — engagement, floor, signing, and submission all in
 * this one server request — and return `{ evidence, floorOutcomes, activity }`. A
 * verifier that errors on the presentation is honest evidence (`submitted:
 * false`), returned 200; only a blank / non-URL interaction URL is a 400.
 * Server-only crypto: the holder key never leaves the server.
 */
export const POST = async ({ request }: { request: Request }) => {
	const { verifierRunner, logger } = appContext();

	let raw: unknown;
	try {
		raw = await request.json();
	} catch {
		return errorResponse(
			'Request body is not valid JSON.',
			'Send a JSON object with `entry`, `interactionUrl`, and an optional `cryptosuite`.'
		);
	}

	const parsed = PresentRequest.schema.safeParse(raw);
	if (!parsed.success) {
		return errorResponse('Bad request shape.', parsed.error.message);
	}

	try {
		const result = await verifierRunner.presentVcalmCredential(parsed.data);
		return json(
			PresentResponse({
				evidence: result.evidence,
				floorOutcomes: result.floorOutcomes,
				activity: result.activity
			})
		);
	} catch (e) {
		if (e instanceof PresentInputError) {
			return errorResponse('The interaction URL could not be engaged.', e.message);
		}
		const message = e instanceof Error ? e.message : String(e);
		logger.error({ err: message }, 'verifier-runner vcalm present failed unexpectedly');
		return errorResponse('Unexpected verifier-runner error.', message, 500);
	}
};

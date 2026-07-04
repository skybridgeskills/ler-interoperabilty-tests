import { json } from '@sveltejs/kit';

import { appContext } from '$lib/server/app-context.js';

import { GenerateRunRequest } from './generate-request.js';

function errorResponse(message: string, hint?: string, status = 400): Response {
	return json({ error: { message, ...(hint ? { hint } : {}) } }, { status });
}

/**
 * Generate a direct-delivery verifier run: four shuffled acceptance
 * passes (`VerifierRunDefinition`) the operator hands to their verifier.
 * Stateless — the client holds the returned definition (ground truth
 * included) and posts it back to the score endpoint.
 */
export const POST = async ({ request }: { request: Request }) => {
	const { verifierRunner, logger } = appContext();

	let raw: unknown = {};
	const text = await request.text();
	if (text.trim() !== '') {
		try {
			raw = JSON.parse(text);
		} catch {
			return errorResponse(
				'Request body is not valid JSON.',
				'Send an empty body or a JSON object with an optional `cryptosuite`.'
			);
		}
	}

	const parsed = GenerateRunRequest.schema.safeParse(raw);
	if (!parsed.success) {
		return errorResponse('Bad request shape.', parsed.error.message);
	}

	try {
		const run = await verifierRunner.generateRun({ cryptosuite: parsed.data.cryptosuite });
		return json(run);
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		logger.error({ err: message }, 'verifier-runner generate failed unexpectedly');
		return errorResponse('Unexpected verifier-runner error.', message, 500);
	}
};

import { json } from '@sveltejs/kit';

import { appContext } from '$lib/server/app-context.js';

import { PlanRequest } from './plan-schemas.js';

function errorResponse(message: string, hint?: string, status = 400): Response {
	return json({ error: { message, ...(hint ? { hint } : {}) } }, { status });
}

/**
 * Generate a credential-less oid4 verifier run plan: four shuffled entries
 * ("Credential 1".."Credential 4"), one per pass kind, with no credentials —
 * OID4VP fixtures are generated server-side at present time. Stateless: the
 * client holds the plan and posts each entry back to the present endpoint, then
 * the whole plan to the score endpoint.
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

	const parsed = PlanRequest.schema.safeParse(raw);
	if (!parsed.success) {
		return errorResponse('Bad request shape.', parsed.error.message);
	}

	try {
		const plan = verifierRunner.planOid4Run({ cryptosuite: parsed.data.cryptosuite });
		return json(plan);
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		logger.error({ err: message }, 'verifier-runner oid4 plan failed unexpectedly');
		return errorResponse('Unexpected verifier-runner error.', message, 500);
	}
};

import { json } from '@sveltejs/kit';

import { appContext } from '$lib/server/app-context.js';
import { VerifierRunMismatchError } from '$lib/server/domain/verifier-runner/index.js';

import { ScoreOid4Request } from './score-schemas.js';

function errorResponse(message: string, hint?: string, status = 400): Response {
	return json({ error: { message, ...(hint ? { hint } : {}) } }, { status });
}

/**
 * Score an attested oid4 verifier run and return the `VerifierRunnerReport`.
 * Merges the automated floor outcomes, the VALID credential's delivery (the
 * only transport result that scores — it lights `oid4.verifier-response-endpoint`),
 * and the operator's per-credential attestations. Reveal artifacts come from the
 * delivered credentials in `evidence`. 400 on run/evidence/attestation mismatch.
 */
export const POST = async ({ request }: { request: Request }) => {
	const { verifierRunner, logger } = appContext();

	let raw: unknown;
	try {
		raw = await request.json();
	} catch {
		return errorResponse(
			'Request body is not valid JSON.',
			'Send a JSON object with `plan`, `evidence`, `attestations`, and `floorOutcomes`.'
		);
	}

	const parsed = ScoreOid4Request.schema.safeParse(raw);
	if (!parsed.success) {
		return errorResponse('Bad request shape.', parsed.error.message);
	}

	try {
		const report = verifierRunner.scoreOid4Run(parsed.data);
		return json(report);
	} catch (e) {
		if (e instanceof VerifierRunMismatchError) {
			return errorResponse('Run, evidence, and attestations do not match.', e.message);
		}
		const message = e instanceof Error ? e.message : String(e);
		logger.error({ err: message }, 'verifier-runner oid4 score failed unexpectedly');
		return errorResponse('Unexpected verifier-runner error.', message, 500);
	}
};

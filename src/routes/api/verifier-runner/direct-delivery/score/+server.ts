import { json } from '@sveltejs/kit';

import { appContext } from '$lib/server/app-context.js';
import { VerifierRunMismatchError } from '$lib/server/domain/verifier-runner/index.js';

import { ScoreRunRequest } from './score-request.js';

function errorResponse(message: string, hint?: string, status = 400): Response {
	return json({ error: { message, ...(hint ? { hint } : {}) } }, { status });
}

/**
 * Score an attested direct-delivery verifier run and return the
 * `VerifierRunnerReport` (checklist outcomes + reveal activity and
 * artifacts). Ground truth stays client-held by design; the server
 * re-validates coherence and 400s on run/attestation mismatch.
 */
export const POST = async ({ request }: { request: Request }) => {
	const { verifierRunner, logger } = appContext();

	let raw: unknown;
	try {
		raw = await request.json();
	} catch {
		return errorResponse(
			'Request body is not valid JSON.',
			'Send a JSON object with `run` and `attestations`.'
		);
	}

	const parsed = ScoreRunRequest.schema.safeParse(raw);
	if (!parsed.success) {
		return errorResponse('Bad request shape.', parsed.error.message);
	}

	try {
		const report = verifierRunner.scoreRun({
			run: parsed.data.run,
			attestations: parsed.data.attestations
		});
		return json(report);
	} catch (e) {
		if (e instanceof VerifierRunMismatchError) {
			return errorResponse('Run and attestations do not match.', e.message);
		}
		const message = e instanceof Error ? e.message : String(e);
		logger.error({ err: message }, 'verifier-runner score failed unexpectedly');
		return errorResponse('Unexpected verifier-runner error.', message, 500);
	}
};

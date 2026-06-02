import { json } from '@sveltejs/kit';

import { appContext } from '$lib/server/app-context.js';
import type { IssuerRunnerReport } from '$lib/server/domain/issuer-runner/issuer-runner-report.js';

import { VerifyRequest } from './verify-request.js';

function fatal(message: string, hint?: string, status = 400): Response {
	const body: IssuerRunnerReport = {
		verified: false,
		fatalError: { message, ...(hint ? { hint } : {}) },
		groups: []
	};
	return json(body, { status });
}

export const POST = async ({ request }: { request: Request }) => {
	const { issuerRunner, logger } = appContext();

	let raw: unknown;
	try {
		raw = await request.json();
	} catch {
		return fatal(
			'Request body is not valid JSON.',
			'Send a JSON object with `credential` and optional `includeAdditive`.'
		);
	}

	const parsed = VerifyRequest.schema.safeParse(raw);
	if (!parsed.success) {
		return fatal('Bad request shape.', parsed.error.message);
	}

	try {
		const report = await issuerRunner.verify({
			credential: parsed.data.credential,
			includeAdditive: parsed.data.includeAdditive ?? false
		});
		return json(report);
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		logger.error({ err: message }, 'issuer-runner verify failed unexpectedly');
		return fatal('Unexpected issuer-runner error.', message, 500);
	}
};

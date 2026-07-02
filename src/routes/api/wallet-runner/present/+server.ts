import { json } from '@sveltejs/kit';
import { z } from 'zod';

import { appContext } from '$lib/server/app-context.js';
import { resolveAuthorizationRequest } from '$lib/server/domain/wallet-client/oid4vp/index.js';

const PresentRequest = z
	.object({
		request: z.record(z.string(), z.unknown()).optional(),
		requestUri: z.string().url().optional(),
		cryptosuite: z.enum(['eddsa-rdfc-2022', 'ecdsa-rdfc-2019']).optional()
	})
	.refine((b) => b.request !== undefined || b.requestUri !== undefined, {
		message: 'Provide either `request` or `requestUri`.'
	});

/**
 * Drive the test wallet through an OID4VP presentation: parse the verifier's authorization
 * request, seed + match a held credential, sign the `vp_token`, submit it via `direct_post`,
 * and return the constructed response + conformance report. Server-only.
 */
export const POST = async ({ request }: { request: Request }) => {
	const { walletClient, exchangeRunnerConfig, logger } = appContext();

	if (!exchangeRunnerConfig.enabled) {
		return json(
			{
				code: 503,
				message: 'Exchange runner disabled',
				hint: 'Set EXCHANGE_RUNNER_ENABLED=true and run `pnpm turbo dev:full` to start the local DCC services.'
			},
			{ status: 503 }
		);
	}

	let body: z.infer<typeof PresentRequest>;
	try {
		body = PresentRequest.parse(await request.json());
	} catch {
		return json(
			{
				code: 400,
				message:
					'Invalid wallet-runner present body (expected { request | requestUri, cryptosuite? }).'
			},
			{ status: 400 }
		);
	}

	try {
		// Resolve an inline request object or fetch it from the verifier's request_uri.
		const resolved = await resolveAuthorizationRequest({
			request: body.request,
			requestUri: body.requestUri
		});
		const result = await walletClient.presentCredential({
			request: resolved,
			cryptosuite: body.cryptosuite
		});
		const failingMustCount = result.report.groups
			.flatMap((g) => g.outcomes)
			.filter((o) => o.level === 'MUST' && o.status === 'fail').length;

		return json({
			matched: result.matched,
			vpToken: result.vpToken,
			presentationSubmission: result.presentationSubmission,
			verify: { verified: result.verify.verified, errors: result.verify.errors },
			submitted: result.submitted,
			submissionResult: result.submissionResult,
			submissionError: result.submissionError,
			report: result.report,
			failingMustCount
		});
	} catch (e) {
		const cause = e instanceof Error ? e.message : String(e);
		logger.warn({ err: cause }, 'wallet presentation flow failed');
		return json(
			{
				code: 502,
				message: 'The test wallet could not complete the presentation.',
				hint: 'Check the OID4VP request shape and the verifier (response_uri) availability.',
				cause
			},
			{ status: 502 }
		);
	}
};

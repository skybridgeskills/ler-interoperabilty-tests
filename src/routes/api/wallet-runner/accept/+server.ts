import { json } from '@sveltejs/kit';
import { z } from 'zod';

import { ProfileSlug } from '$lib/interop/profile-schema.js';
import { appContext } from '$lib/server/app-context.js';

const AcceptRequest = z.object({
	profile: ProfileSlug.schema,
	cryptosuite: z.enum(['eddsa-rdfc-2022', 'ecdsa-rdfc-2019']).optional(),
	exchange: z.object({
		exchangeId: z.string().min(1),
		protocols: z.record(z.string(), z.unknown()).default({})
	})
});

/**
 * Drive the test wallet through a holder acceptance flow for the given profile + already-created
 * exchange, then return the conformance report. Server-only — the wallet's crypto + protocol
 * HTTP run here, never in the browser.
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

	let body: z.infer<typeof AcceptRequest>;
	try {
		body = AcceptRequest.parse(await request.json());
	} catch {
		return json({ code: 400, message: 'Invalid wallet-runner request body.' }, { status: 400 });
	}

	try {
		const result = await walletClient.acceptCredential({
			profile: body.profile,
			cryptosuite: body.cryptosuite,
			exchange: body.exchange
		});
		const failingMustCount = result.report.groups
			.flatMap((g) => g.outcomes)
			.filter((o) => o.level === 'MUST' && o.status === 'fail').length;

		return json({
			exchange: result.exchange,
			verify: { verified: result.verify.verified, errors: result.verify.errors },
			report: result.report,
			failingMustCount
		});
	} catch (e) {
		const cause = e instanceof Error ? e.message : String(e);
		logger.warn({ err: cause }, 'wallet acceptance flow failed');
		return json(
			{
				code: 502,
				message: 'The test wallet could not complete the exchange.',
				hint: 'Check the transaction service logs (`docker logs lits-transaction-service`).',
				cause
			},
			{ status: 502 }
		);
	}
};

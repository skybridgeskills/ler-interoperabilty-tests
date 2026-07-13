import { json } from '@sveltejs/kit';

import { appContext } from '$lib/server/app-context.js';
import { TransactionServiceError } from '$lib/server/domain/exchange-runner/index.js';
import { scorePresentation } from '$lib/server/domain/wallet-runner/index.js';

import { PresentScoreRequest } from './score-schemas.js';

/**
 * Score a REAL operator wallet's credential-presentation from an observed
 * `verify` exchange. Fetches the exchange, and:
 *
 * - if it has NOT settled (`state ∈ {pending, active}`) returns
 *   `{ settled: false, state }` so the page keeps polling — never a spurious fail;
 * - once settled (`complete`/`invalid`) builds a black-box check context from the
 *   echoed VP and returns the per-requirement `report` + `failingMustCount`.
 *
 * Non-observable MUSTs (consent UI, TLS) resolve to `n/a` via the checker
 * fallback and never fail the report. Server-only.
 */
export const POST = async ({ request }: { request: Request }) => {
	const { transactionServiceClient, exchangeRunnerConfig, logger } = appContext();

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

	let body: PresentScoreRequest;
	try {
		body = PresentScoreRequest(await request.json());
	} catch {
		return json(
			{
				code: 400,
				message: 'Invalid present-score body (expected { exchangeId, profile, workflowId? }).'
			},
			{ status: 400 }
		);
	}

	try {
		const exchange = await transactionServiceClient.getExchange(body.workflowId, body.exchangeId);
		const outcome = scorePresentation({
			exchange: { state: exchange.state, variables: exchange.variables },
			profile: body.profile
		});

		if (!outcome.settled) {
			return json({
				settled: false,
				state: outcome.state,
				message: 'Exchange has not settled yet — keep polling.'
			});
		}
		return json({
			settled: true,
			state: outcome.state,
			report: outcome.report,
			failingMustCount: outcome.failingMustCount
		});
	} catch (e) {
		if (e instanceof TransactionServiceError) {
			logger.warn(
				{ status: e.status, exchangeId: body.exchangeId },
				'transaction service returned a non-2xx for present-score getExchange'
			);
			return json(
				{ code: e.status, message: `Transaction service responded ${e.status}` },
				{ status: e.status >= 500 ? 502 : e.status }
			);
		}
		const cause = e instanceof Error ? e.message : String(e);
		logger.error({ err: cause }, 'wallet-runner present-score failed unexpectedly');
		return json(
			{ code: 502, message: 'Cannot score the presentation exchange.', cause },
			{ status: 502 }
		);
	}
};

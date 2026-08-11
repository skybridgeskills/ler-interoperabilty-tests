import { json } from '@sveltejs/kit';

import { appContext } from '$lib/server/app-context.js';
import { TransactionServiceError, WorkflowId } from '$lib/server/domain/exchange-runner/index.js';

/**
 * Adopt endpoint for attach mode: read the protocols of an exchange minted
 * outside the suite (the probe CLI, another harness) so a runnable page can
 * render its QR without ever minting.
 *
 * Deliberately a separate route from the sibling `GET [exchangeId]` poll: the
 * poller ticks every 2s and does not need protocols, so folding them into the
 * poll response would buy a second transaction-service call per tick for a
 * value that never changes.
 *
 * The response mirrors `POST /api/exchange-runner/create` — `{ exchangeId,
 * protocols, workflowId }` — so pages consume one body shape either way. The
 * surrounding behaviour (disabled hint, workflow parsing, error mapping) is the
 * sibling route's, on purpose: one error vocabulary for the runner API.
 */
export const GET = async ({ params, url }: { params: { exchangeId: string }; url: URL }) => {
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

	// Which workflow this exchange belongs to. Supplied by the attaching page
	// from `?workflow=`; unknown/absent values fall back to the issuance
	// (`claim`) path, matching the sibling poll route.
	const workflow = WorkflowId.schema.catch('claim').parse(url.searchParams.get('workflow'));

	try {
		const result = await transactionServiceClient.getProtocols(workflow, params.exchangeId);
		return json(result);
	} catch (e) {
		if (e instanceof TransactionServiceError) {
			logger.warn(
				{ status: e.status, body: e.body, exchangeId: params.exchangeId },
				'transaction service returned a non-2xx for getProtocols'
			);
			return json(
				{
					code: e.status,
					message: `Transaction service responded ${e.status}`
				},
				{ status: e.status >= 500 ? 502 : e.status }
			);
		}
		const cause = e instanceof Error ? e.message : String(e);
		logger.error({ err: cause }, 'transaction service unreachable on getProtocols');
		return json(
			{
				code: 502,
				message: 'Cannot reach the local DCC transaction service',
				hint: 'Run `pnpm turbo dev:full` to start the dependency services.',
				cause
			},
			{ status: 502 }
		);
	}
};

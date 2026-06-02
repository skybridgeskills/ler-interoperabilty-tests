import { json } from '@sveltejs/kit';

import { appContext } from '$lib/server/app-context.js';
import { TransactionServiceError } from '$lib/server/domain/exchange-runner/index.js';

export const POST = async () => {
	const { transactionServiceClient, exchangeRunnerConfig, idService, logger } = appContext();

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

	const retrievalId = idService.uuid();

	try {
		const result = await transactionServiceClient.createExchange({ retrievalId });
		return json(result);
	} catch (e) {
		if (e instanceof TransactionServiceError) {
			logger.warn(
				{ status: e.status, body: e.body },
				'transaction service returned a non-2xx response'
			);
			return json(
				{
					code: e.status,
					message: `Transaction service responded ${e.status}`,
					hint: 'Check the transaction service logs (`docker logs lits-transaction-service`).'
				},
				{ status: e.status >= 500 ? 502 : e.status }
			);
		}
		const cause = e instanceof Error ? e.message : String(e);
		logger.error({ err: cause }, 'transaction service unreachable');
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

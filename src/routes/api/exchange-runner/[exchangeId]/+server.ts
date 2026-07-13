import { json } from '@sveltejs/kit';

import { deriveRunStateFromExchange } from '$lib/interop/index.js';
import { appContext } from '$lib/server/app-context.js';
import { TransactionServiceError, WorkflowId } from '$lib/server/domain/exchange-runner/index.js';

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

	// `?stepCount=` is supplied by the page so derived per-step states match
	// the visible left-column step count. Defaults to 5 (the wallet
	// acceptance × VCALM checklist length); other runnable pages override.
	const stepCount = clampStepCount(url.searchParams.get('stepCount'), 5);

	// Which workflow this exchange belongs to. The page carries it back from the
	// create result; unknown/absent values fall back to the issuance (`claim`)
	// path so existing acceptance-page polls keep working.
	const workflow = WorkflowId.schema.catch('claim').parse(url.searchParams.get('workflow'));

	try {
		const exchange = await transactionServiceClient.getExchange(workflow, params.exchangeId);
		const derived = deriveRunStateFromExchange(
			{ state: exchange.state, variables: exchange.variables },
			stepCount,
			workflow
		);
		return json({ exchange, derived });
	} catch (e) {
		if (e instanceof TransactionServiceError) {
			logger.warn(
				{ status: e.status, body: e.body, exchangeId: params.exchangeId },
				'transaction service returned a non-2xx for getExchange'
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
		logger.error({ err: cause }, 'transaction service unreachable on getExchange');
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

function clampStepCount(raw: string | null, fallback: number): number {
	const n = raw ? Number.parseInt(raw, 10) : NaN;
	if (!Number.isFinite(n) || n <= 0 || n > 50) return fallback;
	return n;
}

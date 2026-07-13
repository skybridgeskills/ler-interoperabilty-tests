import { json, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';

import { appContext } from '$lib/server/app-context.js';
import {
	suiteVerifyDefaults,
	TransactionServiceError
} from '$lib/server/domain/exchange-runner/index.js';
import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * Create-request body. Defaults to `issuance` so the acceptance page's
 * bodyless `POST` keeps working unchanged; a verify run sends
 * `{ intent: 'verification' }`.
 */
const CreateExchangeIntent = ZodFactory(
	z.object({
		intent: z.enum(['issuance', 'verification']).default('issuance')
	})
);

export const POST = async ({ request }: RequestEvent) => {
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

	const { intent } = CreateExchangeIntent.schema.parse(await readJsonBody(request));

	try {
		const result =
			intent === 'verification'
				? await transactionServiceClient.createVerificationExchange({
						vprCredentialType: suiteVerifyDefaults.vprCredentialType,
						vprContext: suiteVerifyDefaults.vprContext
					})
				: await transactionServiceClient.createIssuanceExchange({
						retrievalId: idService.uuid()
					});
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

/** Parse a JSON body, treating an empty/absent/invalid body as `{}`. */
async function readJsonBody(request: Request): Promise<unknown> {
	try {
		const text = await request.text();
		return text.trim() ? JSON.parse(text) : {};
	} catch {
		return {};
	}
}

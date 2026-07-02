import type { ExchangeRunnerConfig } from '../exchange-runner/exchange-runner-config.js';

import type { ContinueExchange } from './drivers/vcalm-acceptance.js';

/**
 * Build a {@link ContinueExchange} transport that POSTs to the live transaction-service's
 * VC-API exchange endpoint (`/workflows/claim/exchanges/:id`). Used by the real wallet client;
 * tests inject an in-memory fake instead.
 */
export function makeHttpContinueExchange(config: ExchangeRunnerConfig): ContinueExchange {
	const workflowId = 'claim';
	return async (exchangeId, body) => {
		const url = `${config.transactionServiceUrl}/workflows/${workflowId}/exchanges/${exchangeId}`;
		const res = await fetch(url, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${config.tenantToken}`,
				'Content-Type': 'application/json',
				Accept: 'application/json'
			},
			body: JSON.stringify(body ?? {})
		});
		if (!res.ok) {
			throw new Error(`Exchange continue responded ${res.status}: ${await res.text()}`);
		}
		return (await res.json()) as Record<string, unknown>;
	};
}

import type {
	CreateExchangeResult,
	ExchangeRunnerConfig,
	TransactionServiceClient
} from '$lib/server/domain/exchange-runner/index.js';
import {
	resolveIssuingContext,
	type CannotServe
} from '$lib/server/domain/scenario-runner/index.js';

/**
 * Mint the issuance exchange for a badge claim, reusing the M2 seam
 * (`resolveIssuingContext` + `createIssuanceExchange`) unchanged.
 *
 * Badges are **elective** — no pinned intent, so `resolveIssuingContext` always
 * resolves for the single tenant. The `!ok` branch is handled for symmetry with
 * the create route. No `tamper`: this is honest issuance from the deployment's
 * own tenant.
 */
export async function mintBadgeClaim(args: {
	client: TransactionServiceClient;
	config: ExchangeRunnerConfig;
	idService: { uuid(): string };
	credential: Record<string, unknown>;
	exchangeIdPrefix: string;
}): Promise<{ ok: true; result: CreateExchangeResult } | { ok: false; reason: CannotServe }> {
	const ctx = resolveIssuingContext(args.config);
	if (!ctx.ok) return { ok: false as const, reason: ctx.reason };
	const result = await args.client.createIssuanceExchange({
		retrievalId: args.idService.uuid(),
		credential: args.credential,
		exchangeIdPrefix: args.exchangeIdPrefix
	});
	return { ok: true as const, result };
}

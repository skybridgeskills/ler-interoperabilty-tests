import { json, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';

import { badgeBySlug } from '$lib/interop/badges/index.js';
import { cannotServeMessage } from '$lib/interop/scenarios/index.js';
import { appContext } from '$lib/server/app-context.js';
import { buildBadgeCredential, mintBadgeClaim } from '$lib/server/domain/badges/index.js';
import { TransactionServiceError } from '$lib/server/domain/exchange-runner/index.js';
import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * Claim-request body: the award numbers the client already computed from its
 * store. These feed **only** the credential's narrative (presentation) — the
 * `criteria.id`/`achievement.id` version is server-computed from the catalog via
 * `badgeFingerprint`, so the client cannot forge it.
 */
const ClaimBadgeRequest = ZodFactory(
	z.object({
		requirementsMet: z.number().int().min(0),
		requirementsTotal: z.number().int().min(1),
		scenarioCount: z.number().int().min(1),
		claimedAt: z.string().min(1)
	})
);

export const POST = async ({ request, params }: RequestEvent) => {
	const { transactionServiceClient, exchangeRunnerConfig, idService, logger } = appContext();

	const badge = badgeBySlug(params.slug ?? '');
	if (!badge) {
		return json(
			{
				code: 404,
				message: `Unknown badge "${params.slug}"`,
				hint: 'No badge is registered for this slug.'
			},
			{ status: 404 }
		);
	}

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

	const parsed = ClaimBadgeRequest.schema.safeParse(await readJsonBody(request));
	if (!parsed.success) {
		return json(
			{
				code: 400,
				message: 'Malformed badge claim',
				hint: 'Send { requirementsMet, requirementsTotal, scenarioCount, claimedAt } from the completion snapshot.'
			},
			{ status: 400 }
		);
	}
	const award = parsed.data;

	try {
		// A fresh credential id per exchange: the status service's allocate is
		// idempotency-guarded per credential id, so a reused one 500s the claim.
		const credential = buildBadgeCredential({
			badge,
			award,
			credentialId: `urn:uuid:${idService.uuid()}`,
			rootUrl: exchangeRunnerConfig.badgeRootUrl
		});

		const minted = await mintBadgeClaim({
			client: transactionServiceClient,
			config: exchangeRunnerConfig,
			idService,
			credential,
			exchangeIdPrefix: badge.slug
		});
		if (!minted.ok) {
			return json(
				{ code: 400, message: cannotServeMessage(minted.reason), reason: minted.reason },
				{ status: 400 }
			);
		}
		return json(minted.result);
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

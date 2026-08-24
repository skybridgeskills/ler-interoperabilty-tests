import { json, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';

import { cannotServeMessage } from '$lib/interop/scenarios/index.js';
import { appContext } from '$lib/server/app-context.js';
import { TransactionServiceError } from '$lib/server/domain/exchange-runner/index.js';
import {
	recipeById,
	requestById,
	resolveIssuingContext,
	allRecipeIds,
	allRequestIds
} from '$lib/server/domain/scenario-runner/index.js';
import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * Create-request body: **a scenario action**, not a bare intent.
 *
 * `deliver-direct` never reaches here — it mints no exchange. The other two
 * kinds mirror `ScenarioAction` so a page can forward a step's action almost
 * verbatim; ids stay opaque strings on the wire and are resolved against the
 * server-side registries below.
 */
const CreateExchangeRequest = ZodFactory(
	z.discriminatedUnion('kind', [
		z.object({
			kind: z.literal('issue'),
			credential: z.string().min(1),
			tamper: z.enum(['proof', 'claim']).optional(),
			intent: z.object({ cryptosuite: z.string(), didMethod: z.string() }).optional(),
			exchangeIdPrefix: z.string().min(1).optional()
		}),
		// The three conduct fields mirror `ScenarioAction`'s. They are NOT
		// cross-validated here: `limitDisclosure` needing `queryLanguage: 'pex'` is
		// an AUTHORING error, caught once at catalog load, not a per-request one
		// worth a 400 on every run.
		z.object({
			kind: z.literal('request-presentation'),
			request: z.string().min(1),
			queryLanguage: z.enum(['dcql', 'pex']).optional(),
			limitDisclosure: z.enum(['required', 'preferred']).optional(),
			advertiseCryptosuites: z.array(z.string()).optional()
		})
	])
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

	const parsed = CreateExchangeRequest.schema.safeParse(await readJsonBody(request));
	if (!parsed.success) {
		return json(
			{
				code: 400,
				message: 'Unrecognised exchange action',
				hint: 'Send { kind: "issue", credential } or { kind: "request-presentation", request }.'
			},
			{ status: 400 }
		);
	}
	const action = parsed.data;

	try {
		if (action.kind === 'request-presentation') {
			const presentationRequest = requestById(action.request);
			if (!presentationRequest) {
				return json(unknownId('presentation request', action.request, allRequestIds()), {
					status: 400
				});
			}
			return json(
				await transactionServiceClient.createVerificationExchange({
					vprCredentialType: presentationRequest.vprCredentialType,
					vprContext: presentationRequest.vprContext,
					...(presentationRequest.trustedIssuers
						? { trustedIssuers: presentationRequest.trustedIssuers }
						: {}),
					...(presentationRequest.vprClaims ? { vprClaims: presentationRequest.vprClaims } : {}),
					// Conduct, forwarded from the action. The registry above held the
					// payload; these three say how the asking is done.
					...(action.queryLanguage ? { queryLanguage: action.queryLanguage } : {}),
					...(action.limitDisclosure ? { limitDisclosure: action.limitDisclosure } : {}),
					...(action.advertiseCryptosuites
						? { advertiseCryptosuites: action.advertiseCryptosuites }
						: {})
				})
			);
		}

		const recipe = recipeById(action.credential);
		if (!recipe) {
			return json(unknownId('credential recipe', action.credential, allRecipeIds()), {
				status: 400
			});
		}

		// The seam. An unservable pin is a request this deployment cannot honour —
		// 400, not a service failure — and the caller renders the scenario disabled
		// with this reason while STILL counting its requirements in the denominator.
		const issuing = resolveIssuingContext(exchangeRunnerConfig, action.intent);
		if (!issuing.ok) {
			return json(
				{ code: 400, message: cannotServeMessage(issuing.reason), reason: issuing.reason },
				{ status: 400 }
			);
		}

		// A fresh credential id per exchange: the status service's allocate is
		// idempotency-guarded per credential id, so a reused one 500s the claim.
		//
		// `issuing.tenantToken` is what makes a pinned scenario real. The
		// transaction service picks its issuer instance at claim time from the
		// cryptosuites the WALLET advertised, so there is no per-exchange way to
		// request a suite — minting under the tenant the seam resolved is the whole
		// mechanism. For an elective scenario that is the default tenant, exactly as
		// before.
		return json(
			await transactionServiceClient.createIssuanceExchange({
				retrievalId: idService.uuid(),
				credential: recipe.build({ credentialId: `urn:uuid:${idService.uuid()}` }),
				tenantToken: issuing.tenantToken,
				...(action.tamper ? { tamper: action.tamper } : {}),
				...(action.exchangeIdPrefix ? { exchangeIdPrefix: action.exchangeIdPrefix } : {})
			})
		);
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

/** Typed 400 body for an id no registry knows. */
function unknownId(what: string, id: string, known: string[]) {
	return {
		code: 400,
		message: `Unknown ${what} "${id}"`,
		hint: `Registered ids: ${known.join(', ')}.`
	};
}

/** Parse a JSON body, treating an empty/absent/invalid body as `{}`. */
async function readJsonBody(request: Request): Promise<unknown> {
	try {
		const text = await request.text();
		return text.trim() ? JSON.parse(text) : {};
	} catch {
		return {};
	}
}

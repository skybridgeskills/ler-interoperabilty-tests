import { json } from '@sveltejs/kit';
import { z } from 'zod';

import { LocallySignedSuite } from '$lib/interop/scenarios/index.js';
import { appContext } from '$lib/server/app-context.js';
import { allRecipeIds, recipeById } from '$lib/server/domain/scenario-runner/index.js';
import {
	WALLET_CRYPTOSUITES,
	type WalletCryptosuite
} from '$lib/server/domain/wallet-crypto/index.js';
import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * Sign one credential recipe for a `deliver-direct` scenario step — a file the
 * operator downloads and hands to the system under test.
 *
 * This is the direct-delivery sibling of `POST /api/exchange-runner/create`:
 * same recipe registry, but no exchange and no tenant — it signs locally.
 * `issue` and `request-presentation` mint through the transaction service;
 * `deliver-direct` has none, so the suite signs locally (ephemeral did:key).
 * It therefore needs **no DCC services running** — only the deployment's
 * configured cryptosuite.
 */
const DeliverDirectRequest = ZodFactory(
	z.object({
		credential: z.string().min(1),
		tamper: z.enum(['proof', 'claim']).optional(),
		cryptosuite: LocallySignedSuite.schema.optional()
	})
);

export const POST = async ({ request }: { request: Request }) => {
	const { scenarioRunner, exchangeRunnerConfig, idService, logger } = appContext();

	const parsed = DeliverDirectRequest.schema.safeParse(await readJsonBody(request));
	if (!parsed.success) {
		return json(
			{
				code: 400,
				message: 'Unrecognised deliver-direct request',
				hint: 'Send { credential, tamper?, cryptosuite? }.'
			},
			{ status: 400 }
		);
	}
	const action = parsed.data;

	const recipe = recipeById(action.credential);
	if (!recipe) {
		return json(
			{
				code: 400,
				message: `Unknown credential recipe "${action.credential}"`,
				hint: `Registered ids: ${allRecipeIds().join(', ')}.`
			},
			{ status: 400 }
		);
	}

	// No tenant resolution here. `deliver-direct` signs with locally-generated
	// keys, and `wallet-crypto` serves both bundle suites unconditionally, so the
	// action's own choice is always servable — see `LocallySignedSuite`. Only
	// `issue` is tenant-bound, because it is the only action the transaction
	// service mints. Absent means the deployment's configured default.
	const cryptosuite = action.cryptosuite ?? exchangeRunnerConfig.cryptosuite;

	// A different failure entirely from an unservable tenant: a DEPLOYMENT
	// configured with a suite `wallet-crypto` cannot sign at all.
	if (!isSignableSuite(cryptosuite)) {
		return json(
			{
				code: 400,
				message: `Cryptosuite "${cryptosuite}" cannot be signed locally.`,
				hint: `Direct delivery signs with one of: ${WALLET_CRYPTOSUITES.join(', ')}.`
			},
			{ status: 400 }
		);
	}

	try {
		const credential = await scenarioRunner.deliverDirect({
			// A fresh credential id per delivery, matching the issue path's discipline.
			doc: recipe.build({ credentialId: `urn:uuid:${idService.uuid()}` }),
			cryptosuite,
			...(action.tamper ? { tamper: action.tamper } : {})
		});
		return json({ credential });
	} catch (e) {
		const cause = e instanceof Error ? e.message : String(e);
		logger.error({ err: cause }, 'deliver-direct signing failed');
		return json(
			{ code: 500, message: 'Could not sign the deliverable credential.', cause },
			{ status: 500 }
		);
	}
};

/** Narrow the deployment's configured cryptosuite to one the local signer supports. */
function isSignableSuite(name: string): name is WalletCryptosuite {
	return (WALLET_CRYPTOSUITES as readonly string[]).includes(name);
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

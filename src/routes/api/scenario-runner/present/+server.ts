import { json } from '@sveltejs/kit';

import { cannotServeMessage } from '$lib/interop/scenarios/index.js';
import { appContext } from '$lib/server/app-context.js';
import {
	allRecipeIds,
	recipeById,
	resolveIssuingContext
} from '$lib/server/domain/scenario-runner/index.js';
import { PresentInputError } from '$lib/server/domain/verifier-present/index.js';
import {
	WALLET_CRYPTOSUITES,
	type WalletCryptosuite
} from '$lib/server/domain/wallet-crypto/index.js';

import { PresentRequest } from './present-schemas.js';

/**
 * Present one recipe credential to the operator's **own verifier** over a fresh
 * single-use VC-API exchange, for a `present-to-verifier` scenario step. The
 * suite is the holder: it signs the credential locally (ephemeral did:key, the
 * same as the deliver-direct signer) and submits it to the exchange the operator
 * pasted.
 *
 * A verifier that errors on the submission is honest evidence
 * (`present.submitted: false`), returned 200; only a blank / non-URL interaction
 * URL or an unknown recipe is a 400. Server-only crypto: the holder key never
 * leaves the server. Needs no DCC services running — only the deployment's
 * configured cryptosuite.
 */
export const POST = async ({ request }: { request: Request }) => {
	const { scenarioRunner, exchangeRunnerConfig, idService, logger } = appContext();

	const parsed = PresentRequest.schema.safeParse(await readJsonBody(request));
	if (!parsed.success) {
		return json(
			{
				code: 400,
				message: 'Unrecognised present request',
				hint: 'Send { credential, interactionUrl, transport: "vcalm" | "oid4vp", tamper? }.'
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

	// The suite presents as holder, but it still signs the credential it presents,
	// so it resolves the deployment's own crypto axis exactly as deliver-direct
	// does. A `present-to-verifier` action pins no intent — the suite chooses.
	const issuing = resolveIssuingContext(exchangeRunnerConfig, undefined);
	if (!issuing.ok) {
		return json(
			{ code: 400, message: cannotServeMessage(issuing.reason), reason: issuing.reason },
			{ status: 400 }
		);
	}

	if (!isSignableSuite(issuing.cryptosuite)) {
		return json(
			{
				code: 400,
				message: `This deployment's cryptosuite "${issuing.cryptosuite}" cannot be signed locally.`,
				hint: `Presenting signs with one of: ${WALLET_CRYPTOSUITES.join(', ')}.`
			},
			{ status: 400 }
		);
	}

	try {
		const {
			request: verifierRequest,
			present,
			trace
		} = await scenarioRunner.present({
			// A fresh credential id per present, matching the issue/deliver-direct discipline.
			doc: recipe.build({ credentialId: `urn:uuid:${idService.uuid()}` }),
			cryptosuite: issuing.cryptosuite,
			...(action.tamper ? { tamper: action.tamper } : {}),
			transport: action.transport,
			interactionUrl: action.interactionUrl
		});
		// `trace` goes back whether or not the presentation landed — a present that
		// never submitted is exactly when the operator needs to see what the wire
		// did. It is display-only and scores nothing.
		return json({ request: verifierRequest, present, trace });
	} catch (e) {
		if (e instanceof PresentInputError) {
			return json({ code: 400, message: e.message }, { status: 400 });
		}
		const cause = e instanceof Error ? e.message : String(e);
		logger.error({ err: cause }, 'present-to-verifier failed');
		return json(
			{ code: 500, message: 'Could not present the credential to the verifier.', cause },
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

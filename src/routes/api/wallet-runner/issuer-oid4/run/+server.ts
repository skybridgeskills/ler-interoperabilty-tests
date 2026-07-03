import { json } from '@sveltejs/kit';
import { z } from 'zod';

import { appContext } from '$lib/server/app-context.js';
import {
	oid4IssuerFlowChecks,
	runIssuerFlowChecks
} from '$lib/server/domain/wallet-runner/index.js';

const RunRequest = z.object({
	offerUrl: z.string().min(1),
	cryptosuite: z.enum(['eddsa-rdfc-2022', 'ecdsa-rdfc-2019']).optional()
});

/**
 * Drive the test wallet through the OID4VCI 1.0 pre-authorized-code issuer flow against a
 * user-pasted `openid-credential-offer://` URL, run the per-requirement conformance checks, and
 * return a report mapped to the base issuer OID4 checklist ids. Run-to-completion + stateless — the
 * wallet's crypto and the (tokenless) HTTP to the user's issuer run here, never in the browser. The
 * run stops at the first blocking failure (`blocked` / `stoppedAtStep`); requirements past that
 * point are omitted (pending). The response `raw` carries the wallet's own per-step transcript; the
 * access token is never serialized.
 */
export const POST = async ({ request }: { request: Request }) => {
	const { oid4IssuerFlow, logger } = appContext();

	let body: z.infer<typeof RunRequest>;
	try {
		body = RunRequest.parse(await request.json());
	} catch {
		return json({ code: 400, message: 'Invalid issuer-flow request body.' }, { status: 400 });
	}

	try {
		const run = await oid4IssuerFlow.runIssuerFlow(body.offerUrl, body.cryptosuite);
		const { report, outcomes } = runIssuerFlowChecks(run.observations, {
			profile: 'oid4',
			registry: oid4IssuerFlowChecks
		});
		const failingMustCount = outcomes.filter(
			(o) => o.level === 'MUST' && o.status === 'fail'
		).length;

		const { offer, issuerMeta, asMeta, token, nonce, delivery, verify, transcript } =
			run.observations;
		return json({
			report,
			outcomes,
			blocked: run.blocked,
			stoppedAtStep: run.stoppedAtStep,
			verified: report.verified,
			failingMustCount,
			raw: {
				offer,
				issuerMeta,
				asMeta,
				// `token` already carries only `{ redeemed, cNonce }` — never the access token.
				token,
				nonce,
				delivery: delivery
					? {
							status: delivery.status,
							credential: delivery.credential,
							presentation: delivery.presentation
						}
					: undefined,
				verify,
				transcript
			}
		});
	} catch (e) {
		const cause = e instanceof Error ? e.message : String(e);
		logger.warn({ err: cause }, 'issuer OID4 flow failed');
		return json(
			{
				code: 502,
				message: 'The test wallet could not complete the OID4VCI issuer flow.',
				hint: 'Confirm the `openid-credential-offer://` URL is reachable and is a pre-authorized-code offer.',
				cause
			},
			{ status: 502 }
		);
	}
};

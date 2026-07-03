import { json } from '@sveltejs/kit';
import { z } from 'zod';

import { appContext } from '$lib/server/app-context.js';
import {
	runIssuerFlowChecks,
	vcalmIssuerFlowChecks
} from '$lib/server/domain/wallet-runner/index.js';

const RunRequest = z.object({
	interactionUrl: z.string().min(1),
	cryptosuite: z.enum(['eddsa-rdfc-2022', 'ecdsa-rdfc-2019']).optional()
});

/**
 * Drive the test wallet through the whole VCALM issuer flow against the user-supplied interaction
 * URL, run the per-requirement conformance checks, and return a report mapped to the base issuer
 * VCALM checklist ids. Run-to-completion + stateless — the wallet's crypto and the (tokenless)
 * HTTP to the user's exchange run here, never in the browser. The run stops at the first blocking
 * failure (`blocked` / `stoppedAtStep`); requirements past that point are simply omitted (pending).
 */
export const POST = async ({ request }: { request: Request }) => {
	const { vcalmIssuerFlow, logger } = appContext();

	let body: z.infer<typeof RunRequest>;
	try {
		body = RunRequest.parse(await request.json());
	} catch {
		return json({ code: 400, message: 'Invalid issuer-flow request body.' }, { status: 400 });
	}

	try {
		const run = await vcalmIssuerFlow.runIssuerFlow(body.interactionUrl, body.cryptosuite);
		const { report, outcomes } = runIssuerFlowChecks(run.observations, {
			profile: 'vcalm',
			registry: vcalmIssuerFlowChecks
		});
		const failingMustCount = outcomes.filter(
			(o) => o.level === 'MUST' && o.status === 'fail'
		).length;

		const { interaction, didAuth, delivery, verify } = run.observations;
		return json({
			report,
			outcomes,
			blocked: run.blocked,
			stoppedAtStep: run.stoppedAtStep,
			verified: report.verified,
			failingMustCount,
			raw: {
				interaction: interaction?.rawBody,
				didAuth: didAuth?.vpr,
				delivery: delivery
					? {
							status: delivery.status,
							credential: delivery.credential,
							presentation: delivery.presentation
						}
					: undefined,
				verify
			}
		});
	} catch (e) {
		const cause = e instanceof Error ? e.message : String(e);
		logger.warn({ err: cause }, 'issuer VCALM flow failed');
		return json(
			{
				code: 502,
				message: 'The test wallet could not complete the issuer flow.',
				hint: 'Confirm the interaction URL is reachable and returns VCALM interaction protocols.',
				cause
			},
			{ status: 502 }
		);
	}
};

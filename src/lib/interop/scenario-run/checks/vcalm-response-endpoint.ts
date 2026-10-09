import type { AutomaticCheck } from '../automatic-checks.js';
import { verifierPresentForStep } from '../evidence.js';

/**
 * The delivery check: the credential this step presented was submitted to the
 * verifier's exchange. Ported 1:1 from the verifier-runner `vcalm`
 * exchange-endpoint row (`score-delivered-run.ts`), which scored delivery from
 * the VALID pass's submission — here the delivery scenario presents a valid
 * control, so a submitted control is an honest "your endpoint accepts a
 * presentation" probe, decoupled from any concealed acceptance verdict.
 *
 * **This says the submission landed, and nothing more** — whether the verifier
 * *accepts* the credential is its private decision, attested in the acceptance
 * scenario, never read from the wire here.
 */
export const vcalmResponseEndpoint: AutomaticCheck = {
	id: 'vcalm-response-endpoint',
	summary: 'The credential was submitted to the verifier’s exchange endpoint.',
	run: ({ stepId, evidence }) => {
		const present = verifierPresentForStep(evidence, stepId);
		if (!present) return { met: false, detail: 'This step did not present to a verifier.' };
		return present.submitted
			? { met: true, detail: 'The credential was submitted to the exchange.' }
			: {
					met: false,
					detail:
						present.error?.message ?? 'The credential was not submitted to the exchange endpoint.'
				};
	}
};

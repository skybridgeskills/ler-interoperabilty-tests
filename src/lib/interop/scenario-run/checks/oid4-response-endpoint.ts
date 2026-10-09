import type { AutomaticCheck } from '../automatic-checks.js';
import { verifierPresentForStep } from '../evidence.js';

/**
 * The delivery check: the credential this step presented was submitted to the
 * verifier's `direct_post` response endpoint. Ported from the verifier-runner
 * `oid4` delivery row — here the delivery scenario presents a valid control, so
 * a submitted control is an honest "your response endpoint accepts a
 * presentation" probe, decoupled from any concealed acceptance verdict.
 *
 * **This says the submission landed, and nothing more** — whether the verifier
 * *accepts* the credential is its private decision, attested in the acceptance
 * scenario, never read from the wire here.
 */
export const oid4ResponseEndpoint: AutomaticCheck = {
	id: 'oid4-response-endpoint',
	summary: 'The credential was submitted to the verifier’s response endpoint.',
	run: ({ stepId, evidence }) => {
		const present = verifierPresentForStep(evidence, stepId);
		if (!present) return { met: false, detail: 'This step did not present to a verifier.' };
		return present.submitted
			? { met: true, detail: 'The credential was submitted to the response endpoint.' }
			: {
					met: false,
					detail:
						present.error?.message ?? 'The credential was not submitted to the response endpoint.'
				};
	}
};

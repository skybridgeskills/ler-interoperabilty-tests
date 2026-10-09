import type { AutomaticCheck } from '../automatic-checks.js';
import { artifactForStep } from '../evidence.js';

import { credentialOf, NO_CREDENTIAL } from './credential-shape.js';

/**
 * The credential declares a parseable expiration. Ported from the issuer
 * engine's `valid-until-optional` / `valid-until` rows.
 *
 * **Resolution (M11):** an absent `validUntil` was `n/a` on the direct page and
 * `warn` on both live pages. The automatic model has neither, so an absent
 * expiration now **fails** — as a SHOULD, which records and shows the gap
 * without blocking the scenario. That is what the row always meant: an
 * unbounded credential is a real, reportable choice, not an absence of
 * information.
 */
export const credentialValidUntil: AutomaticCheck = {
	id: 'credential-valid-until',
	summary: 'The credential declares a parseable `validUntil`.',
	run: ({ stepId, evidence }) => {
		const credential = credentialOf(artifactForStep(evidence, stepId));
		if (!credential) return { met: false, detail: NO_CREDENTIAL };
		const validUntil = credential.validUntil;
		if (validUntil === undefined) {
			return {
				met: false,
				detail: 'The credential sets no `validUntil`, so it declares no expiration.'
			};
		}
		return typeof validUntil === 'string' && !Number.isNaN(Date.parse(validUntil))
			? { met: true, detail: '`validUntil` is present and parseable.' }
			: { met: false, detail: '`validUntil` is present but is not a valid ISO date string.' };
	}
};

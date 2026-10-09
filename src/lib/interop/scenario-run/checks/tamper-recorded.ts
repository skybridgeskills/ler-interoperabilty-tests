import type { AutomaticCheck } from '../automatic-checks.js';
import { exchangeVariable } from '../evidence.js';

/**
 * The exchange records the tamper instruction we sent.
 *
 * **This one retires a live hazard.** Against a deployment predating the tamper
 * seam, `tamper` is stripped and an intact credential is delivered — so a
 * discrimination scenario's tampered pass offers the wallet a *valid*
 * credential, the operator honestly answers "accepted", the concealed answer is
 * "refused", and the scenario **fails a conformant wallet**. With this check the
 * run says *"the exchange records no tamper instruction"* instead, which is the
 * truth. It works against **any** pin, current or stale — something a digest
 * bump could never do.
 *
 * Presence is the proof: upstream `tamper` is `.optional()` with no
 * `.default()`, and only this suite sets it.
 */
export const tamperRecorded: AutomaticCheck = {
	id: 'tamper-recorded',
	summary: 'The exchange records the tamper instruction we sent.',
	run: ({ stepId, evidence }) =>
		exchangeVariable(evidence, stepId, 'tamper') !== undefined
			? { met: true, detail: 'The exchange records a tamper instruction.' }
			: {
					met: false,
					detail:
						'The exchange records no tamper instruction — this deployment may not support it, ' +
						'so the credential was delivered intact.'
				}
};

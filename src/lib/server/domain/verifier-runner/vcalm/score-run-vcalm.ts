import {
	type PassAttestation,
	type PresentEvidence,
	type VerifierCheckOutcome,
	type VerifierRunnerReport,
	type VerifierRunPlan
} from '$lib/interop/verifier-run/index.js';

import { scoreDeliveredRun } from '../score-delivered-run.js';

/**
 * Score a vcalm verifier run. Thin wrapper over {@link scoreDeliveredRun}:
 * the VALID credential's successful submission to the exchange lights
 * `vcalm.verifier-exchange-endpoint`; defect deliveries are activity only.
 */
export function scoreVcalmRun(args: {
	plan: VerifierRunPlan;
	evidence: PresentEvidence[];
	attestations: PassAttestation[];
	floorOutcomes: VerifierCheckOutcome[];
}): VerifierRunnerReport {
	return scoreDeliveredRun({
		...args,
		delivery: {
			rowId: 'vcalm.verifier-exchange-endpoint',
			acceptedMessage: 'The verifier accepted the presentation at its exchange endpoint.',
			rejectedMessage: (error) =>
				`The verifier did not accept the presentation at its exchange endpoint${
					error ? ` (${error})` : ''
				}.`
		}
	});
}

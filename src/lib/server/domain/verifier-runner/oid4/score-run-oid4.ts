import {
	type PassAttestation,
	type PresentEvidence,
	type VerifierCheckOutcome,
	type VerifierRunnerReport,
	type VerifierRunPlan
} from '$lib/interop/verifier-run/index.js';

import { scoreDeliveredRun } from '../score-delivered-run.js';

/**
 * Score an oid4 verifier run. Thin wrapper over {@link scoreDeliveredRun}:
 * the VALID credential's successful `direct_post` delivery lights
 * `oid4.verifier-response-endpoint`; defect deliveries are activity only.
 */
export function scoreOid4Run(args: {
	plan: VerifierRunPlan;
	evidence: PresentEvidence[];
	attestations: PassAttestation[];
	floorOutcomes: VerifierCheckOutcome[];
}): VerifierRunnerReport {
	return scoreDeliveredRun({
		...args,
		delivery: {
			rowId: 'oid4.verifier-response-endpoint',
			acceptedMessage: 'The verifier accepted the presentation at its response endpoint.',
			rejectedMessage: (error) =>
				`The verifier did not accept the presentation at its response endpoint${
					error ? ` (${error})` : ''
				}.`
		}
	});
}

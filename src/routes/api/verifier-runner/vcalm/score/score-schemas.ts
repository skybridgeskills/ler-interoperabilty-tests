import { z } from 'zod';

import {
	PassAttestation,
	PresentEvidence,
	VerifierCheckOutcome,
	VerifierRunPlan
} from '$lib/interop/verifier-run/index.js';
import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * Request body for `POST /api/verifier-runner/vcalm/score`: the client
 * round-trips everything it accumulated statelessly — the run plan, one present
 * evidence per entry, one attestation per entry, and the automated floor
 * outcomes from the first pass. The scoring engine re-validates coherence.
 */
export const ScoreVcalmRequest = ZodFactory(
	z.object({
		plan: VerifierRunPlan.schema,
		evidence: z.array(PresentEvidence.schema),
		attestations: z.array(PassAttestation.schema),
		floorOutcomes: z.array(VerifierCheckOutcome.schema)
	})
);
export type ScoreVcalmRequest = ReturnType<typeof ScoreVcalmRequest>;

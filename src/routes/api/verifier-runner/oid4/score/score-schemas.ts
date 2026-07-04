import { z } from 'zod';

import {
	PassAttestation,
	PresentEvidence,
	VerifierCheckOutcome,
	VerifierRunPlan
} from '$lib/interop/verifier-run/index.js';
import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * Request body for `POST /api/verifier-runner/oid4/score`: the client
 * round-trips everything it accumulated statelessly — the run plan, one present
 * evidence per entry, one attestation per entry, and the automated floor
 * outcomes from the inspect endpoint. The scoring engine re-validates coherence.
 */
export const ScoreOid4Request = ZodFactory(
	z.object({
		plan: VerifierRunPlan.schema,
		evidence: z.array(PresentEvidence.schema),
		attestations: z.array(PassAttestation.schema),
		floorOutcomes: z.array(VerifierCheckOutcome.schema)
	})
);
export type ScoreOid4Request = ReturnType<typeof ScoreOid4Request>;

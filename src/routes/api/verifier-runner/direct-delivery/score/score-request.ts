import { z } from 'zod';

import { PassAttestation, VerifierRunDefinition } from '$lib/interop/verifier-run/index.js';
import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * Request body for `POST /api/verifier-runner/direct-delivery/score`:
 * the client-held run definition plus one attestation per pass. Zod
 * enforces the shapes (kinds from the enum); the scoring engine
 * re-validates coherence (ids match, each kind exactly once).
 */
export const ScoreRunRequest = ZodFactory(
	z.object({
		run: VerifierRunDefinition.schema,
		attestations: z.array(PassAttestation.schema)
	})
);
export type ScoreRunRequest = ReturnType<typeof ScoreRunRequest>;

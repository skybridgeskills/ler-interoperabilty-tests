import { z } from 'zod';

import { VerifierRunPlan } from '$lib/interop/verifier-run/index.js';
import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * Request body for `POST /api/verifier-runner/vcalm/plan`. `cryptosuite` selects
 * the suite the present-time fixtures are signed with; the body is kept open for
 * future per-run options. The response is a {@link VerifierRunPlan}.
 */
export const PlanRequest = ZodFactory(
	z.object({
		cryptosuite: z.enum(['eddsa-rdfc-2022', 'ecdsa-rdfc-2019']).default('eddsa-rdfc-2022')
	})
);
export type PlanRequest = ReturnType<typeof PlanRequest>;

export { VerifierRunPlan };

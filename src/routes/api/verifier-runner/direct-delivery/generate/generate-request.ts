import { z } from 'zod';

import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * Request body for `POST /api/verifier-runner/direct-delivery/generate`.
 * `cryptosuite` selects which data-integrity suite signs the pass
 * credentials (defaults to `eddsa-rdfc-2022`). An empty body is accepted
 * and treated as `{}`.
 */
export const GenerateRunRequest = ZodFactory(
	z.object({
		cryptosuite: z.enum(['eddsa-rdfc-2022', 'ecdsa-rdfc-2019']).default('eddsa-rdfc-2022')
	})
);
export type GenerateRunRequest = ReturnType<typeof GenerateRunRequest>;

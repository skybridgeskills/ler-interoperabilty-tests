import { z } from 'zod';

import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * Request body for `POST /api/issuer-runner/verify`. `credential` is
 * accepted as untyped JSON — the issuer-runner pipeline (verifier-core
 * + check-runner) tolerates malformed input and surfaces issues in
 * the report.
 */
export const VerifyRequest = ZodFactory(
	z.object({
		credential: z.unknown(),
		includeAdditive: z.boolean().optional()
	})
);
export type VerifyRequest = ReturnType<typeof VerifyRequest>;

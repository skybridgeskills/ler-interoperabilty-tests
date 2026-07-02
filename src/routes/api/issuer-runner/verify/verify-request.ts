import { z } from 'zod';

import { AdditiveProfileSlug } from '$lib/interop/additive-profile-schema.js';
import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * Request body for `POST /api/issuer-runner/verify`. `credential` is
 * accepted as untyped JSON — the issuer-runner pipeline (verifier-core
 * + check-runner) tolerates malformed input and surfaces issues in
 * the report. `additiveProfiles` lists the additive profiles to include
 * in the report (defaults to none).
 */
export const VerifyRequest = ZodFactory(
	z.object({
		credential: z.unknown(),
		additiveProfiles: z.array(AdditiveProfileSlug.schema).optional()
	})
);
export type VerifyRequest = ReturnType<typeof VerifyRequest>;

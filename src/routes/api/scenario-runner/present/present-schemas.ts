import { z } from 'zod';

import { LocallySignedSuite } from '$lib/interop/scenarios/index.js';
import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * Present one recipe credential to the operator's verifier over a live exchange.
 *
 * `interactionUrl` is the operator's run-time input — a VC-API interaction URL
 * for `'vcalm'`, or a pasted OID4VP authorization request (`openid4vp://` link,
 * `request_uri` URL, or request JSON) for `'oid4vp'` — so it is required and
 * non-empty (a blank value is a 400, not a transport miss). `transport` carries
 * `'vcalm'` (M10a) and `'oid4vp'` (M10b).
 *
 * `cryptosuite` is what the suite signs the presented credential with — locally
 * generated and therefore always servable. Absent means the deployment's default.
 */
export const PresentRequest = ZodFactory(
	z.object({
		credential: z.string().min(1),
		interactionUrl: z.string().min(1),
		transport: z.enum(['vcalm', 'oid4vp']),
		tamper: z.enum(['proof', 'claim']).optional(),
		cryptosuite: LocallySignedSuite.schema.optional()
	})
);
export type PresentRequest = ReturnType<typeof PresentRequest>;

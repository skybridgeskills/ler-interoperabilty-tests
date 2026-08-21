import { z } from 'zod';

import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * Present one recipe credential to the operator's verifier over a live exchange.
 *
 * `interactionUrl` is the operator's run-time input — the URL their verifier
 * handed them — so it is required and non-empty (a blank value is a 400, not a
 * transport miss). `transport` is `'vcalm'` only in M10a; `'oid4vp'` arrives in
 * M10b.
 */
export const PresentRequest = ZodFactory(
	z.object({
		credential: z.string().min(1),
		interactionUrl: z.string().min(1),
		transport: z.literal('vcalm'),
		tamper: z.enum(['proof', 'claim']).optional()
	})
);
export type PresentRequest = ReturnType<typeof PresentRequest>;

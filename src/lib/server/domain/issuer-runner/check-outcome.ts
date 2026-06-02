import { z } from 'zod';

import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * The outcome of one automated check against a pasted credential.
 *
 * - `pass` — requirement satisfied.
 * - `fail` — requirement violated. For MUST rows this contributes to
 *   the report's `verified === false`; for SHOULD/MAY it reads as a
 *   warning to the implementer.
 * - `warn` — requirement nominally satisfied but with a caveat (e.g.
 *   off-allowlist CTDL host).
 * - `n/a` — no automated check ran, either because no function is
 *   registered or because the requirement only applies when an
 *   optional feature is enabled.
 */
export const CheckOutcome = ZodFactory(
	z.object({
		id: z.string(),
		level: z.enum(['MUST', 'SHOULD', 'MAY']),
		status: z.enum(['pass', 'fail', 'warn', 'n/a']),
		message: z.string()
	})
);
export type CheckOutcome = ReturnType<typeof CheckOutcome>;

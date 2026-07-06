import { z } from 'zod';

import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * What the suite's test wallet observed while presenting one plan
 * entry's credential to the operator's verifier: whether the submission
 * went out, the transport response (status/body) or error, and the
 * presented credential itself. `credential` is the artifact for the
 * wallet log — public by design, the same thing M1 shipped to the
 * client. Transport evidence is activity only; it never scores a row
 * here.
 */
export const PresentEvidence = ZodFactory(
	z.object({
		passId: z.string().min(1),
		submitted: z.boolean(),
		transportStatus: z.number().optional(),
		transportBody: z.unknown().optional(),
		submissionError: z.string().optional(),
		credential: z.unknown()
	})
);
export type PresentEvidence = ReturnType<typeof PresentEvidence>;

import { z } from 'zod';

import { RequirementLevel } from '$lib/interop/scenarios/index.js';
import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * What the operator actually answered.
 *
 * **`cant-tell` carries no reason code, and never will.** A closed enum of
 * *causes* works on the verifier side — a verifier is software with structured
 * output, so `signature | schema | expiry | other` is answerable. A wallet is
 * not: lifting that enum here would produce an enum of operator guesswork.
 */
export const AttestedAnswerValue = ZodFactory(
	z.discriminatedUnion('kind', [
		z.object({ kind: z.literal('affirm'), value: z.boolean() }),
		z.object({ kind: z.literal('choose'), value: z.string() }),
		z.object({ kind: z.literal('cant-tell') })
	])
);
export type AttestedAnswerValue = ReturnType<typeof AttestedAnswerValue>;

/**
 * One requirement's settled result.
 *
 * Both the raw `answer` and the `expected` answer are **denormalised into the
 * outcome**, which is what lets a stored run render its reveal without the live
 * scenario definition. It looks redundant beside the catalog and is not: the
 * catalog moves on, and a result that could only be explained by the current
 * catalog would silently start explaining itself wrongly.
 *
 * `source` carries forward the existing `attested | automated` marker.
 */
export const RequirementOutcome = ZodFactory(
	z.object({
		requirementId: z.string().min(1),
		level: RequirementLevel.schema,
		status: z.enum(['pass', 'fail']),
		source: z.enum(['automated', 'attested']),
		answer: AttestedAnswerValue.schema.optional(),
		expected: AttestedAnswerValue.schema.optional(),
		/** Why, in one line — a check's reason, or the reveal's explanation. */
		detail: z.string().optional()
	})
);
export type RequirementOutcome = ReturnType<typeof RequirementOutcome>;

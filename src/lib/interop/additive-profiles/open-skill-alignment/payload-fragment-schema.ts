import { z } from 'zod';

import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * Open Badges 3.0 Alignment with a recognized `targetUrl`. The host
 * allowlist enforcement (Credential Registry vs warn-only) lives in
 * the issuer-runner check-runner, not in this wire-shape schema —
 * here we only require a URL.
 */
const Alignment = z.object({
	type: z.array(z.string()).min(1),
	targetType: z.string(),
	targetName: z.string(),
	targetFramework: z.string().optional(),
	targetCode: z.string().optional(),
	targetDescription: z.string().optional(),
	targetUrl: z.string().url()
});

/** A single level inside a `RubricCriterionLevel` resultDescription. */
const RubricCriterionLevel = z.object({
	id: z.string(),
	type: z.array(z.string()).min(1),
	alignment: z.array(Alignment).optional(),
	description: z.string().optional(),
	level: z.string(),
	name: z.string(),
	points: z.string().optional()
});

/** One declared performance scale on the achievement. */
const ResultDescription = z.object({
	id: z.string(),
	type: z.array(z.string()).min(1),
	alignment: z.array(Alignment).optional(),
	allowedValue: z.array(z.string()).optional(),
	name: z.string(),
	requiredLevel: z.string().optional(),
	requiredValue: z.string().optional(),
	resultType: z.enum(['RawScore', 'Percent', 'RubricCriterionLevel']),
	rubricCriterionLevel: z.array(RubricCriterionLevel).optional(),
	valueMax: z.string().optional(),
	valueMin: z.string().optional()
});

/** One asserted learner result linked back to a declared description. */
const Result = z.object({
	type: z.array(z.string()).min(1),
	achievedLevel: z.string().optional(),
	alignment: z.array(Alignment).optional(),
	resultDescription: z.string(),
	status: z.string().optional(),
	value: z.string().optional()
});

/**
 * The credential-payload fragment that the additive profile contributes
 * to an OpenBadgeCredential. `resultDescription[]` lands inside
 * `credentialSubject.achievement` and `result[]` inside
 * `credentialSubject`.
 *
 * This schema validates structural well-formedness only; semantic
 * cross-checks (value in `[valueMin, valueMax]`, `achievedLevel`
 * matching one of the description's levels) live in the issuer-runner
 * check library.
 */
export const OpenSkillAlignmentFragment = ZodFactory(
	z.object({
		resultDescription: z.array(ResultDescription).min(1),
		result: z.array(Result).min(1)
	})
);
export type OpenSkillAlignmentFragment = ReturnType<typeof OpenSkillAlignmentFragment>;

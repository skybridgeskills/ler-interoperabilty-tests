import { ob3DirectDeliveryIssuerChecks } from './ob3-direct-delivery-issuer.js';
import { openSkillAlignmentIssuerChecks } from './open-skill-alignment-issuer.js';
import type { CheckFn } from './types.js';

/**
 * Map from requirement-id → automated check fn. The check-runner
 * looks up requirements by their stable `id` and falls back to `'n/a'`
 * for ids without a registered function — so partial coverage is
 * safe.
 */
export const checkRegistry: Record<string, CheckFn> = {
	...ob3DirectDeliveryIssuerChecks,
	...openSkillAlignmentIssuerChecks
};

export type { CheckCtx, CheckFn, CheckResult, VerifierCoreResultLite } from './types.js';

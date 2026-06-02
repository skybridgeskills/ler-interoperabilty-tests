import { z } from 'zod';

import { RoleSlug, WorkflowSlug } from '$lib/interop/profile-schema.js';
import { ZodFactory } from '$lib/util/zod-factory.js';

import { CheckOutcome } from './check-outcome.js';

/** Identifies a checklist the check-runner evaluated requirements against. */
export const ChecklistGroupRef = ZodFactory(
	z.object({
		kind: z.enum(['base', 'additive']),
		profileSlug: z.string(),
		profileName: z.string(),
		workflow: WorkflowSlug.schema,
		role: RoleSlug.schema
	})
);
export type ChecklistGroupRef = ReturnType<typeof ChecklistGroupRef>;

/**
 * The typed response shape returned by `POST /api/issuer-runner/verify`.
 *
 * `verified` is `true` iff every MUST requirement across every group
 * is `pass`. `fatalError` is set when verifier-core or the request
 * pipeline itself failed; per-requirement outcomes are still rendered
 * when present.
 */
export const IssuerRunnerReport = ZodFactory(
	z.object({
		verified: z.boolean(),
		fatalError: z.object({ message: z.string(), hint: z.string().optional() }).optional(),
		groups: z.array(
			z.object({
				checklist: ChecklistGroupRef.schema,
				outcomes: z.array(CheckOutcome.schema)
			})
		)
	})
);
export type IssuerRunnerReport = ReturnType<typeof IssuerRunnerReport>;

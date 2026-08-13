import { z } from 'zod';

import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * Semantic tone of one requirement row, independent of colors/markup. A row
 * component maps `tone` to dot + pill classes so persisted history and live
 * runs render identically. Framework- and server-free: this module carries the
 * data type only; the mappers that produce it (which need server check
 * outcomes) live in `components/`.
 */
export const RequirementStatusTone = ZodFactory(
	z.enum(['pass', 'warn', 'fail', 'pending', 'in-flight', 'skipped', 'n/a'])
);
export type RequirementStatusTone = ReturnType<typeof RequirementStatusTone>;

/**
 * Persisted, presentation-ready status for one requirement row. This is the
 * shape stored in run history — it deliberately omits `raw` (the live-only
 * collapsible body); the display superset `RequirementStatusView` adds it back
 * for in-memory rendering.
 */
export const RequirementStatus = ZodFactory(
	z.object({
		tone: RequirementStatusTone.schema,
		/** Uppercase pill text, e.g. `PASS`, `IN PROGRESS`, `PENDING`, `FAIL · MUST`. */
		label: z.string(),
		/** Inline message (fail/warn) or details message; optional. */
		message: z.string().optional(),
		/**
		 * Set when the row was resolved from the operator's attestation of their
		 * own system's behavior (verifier acceptance passes) rather than an
		 * automated check — the row renders a small ATTESTED pill.
		 */
		attested: z.boolean().optional()
	})
);
export type RequirementStatus = ReturnType<typeof RequirementStatus>;

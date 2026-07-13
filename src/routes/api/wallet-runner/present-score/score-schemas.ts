import { z } from 'zod';

import { ProfileSlug } from '$lib/interop/profile-schema.js';
import { IssuerRunnerReport } from '$lib/server/domain/issuer-runner/issuer-runner-report.js';
import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * Request body for `POST /api/wallet-runner/present-score`: the id + profile of
 * an observed verify (presentation) exchange to score. `workflowId` defaults to
 * `verify` (the only workflow that produces a `VerificationResult`).
 */
export const PresentScoreRequest = ZodFactory(
	z.object({
		exchangeId: z.string().min(1),
		profile: ProfileSlug.schema,
		workflowId: z.enum(['claim', 'verify']).default('verify')
	})
);
export type PresentScoreRequest = ReturnType<typeof PresentScoreRequest>;

/**
 * Response for `POST /api/wallet-runner/present-score`. Reuses the normalized
 * wallet-run report shape (`IssuerRunnerReport`). When the exchange has not
 * settled (`state ∈ {pending, active}`), `settled` is `false` and no `report`
 * is returned — the page keeps polling — rather than a spurious failing report.
 */
export const PresentScoreResponse = ZodFactory(
	z.object({
		settled: z.boolean(),
		state: z.enum(['pending', 'active', 'complete', 'invalid']),
		report: IssuerRunnerReport.schema.optional(),
		failingMustCount: z.number().int().nonnegative().optional(),
		message: z.string().optional()
	})
);
export type PresentScoreResponse = ReturnType<typeof PresentScoreResponse>;

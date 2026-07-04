import { z } from 'zod';

import { RoleSlug, WorkflowSlug } from '$lib/interop/profile-schema.js';
import { WalletActivity, WalletArtifact } from '$lib/interop/wallet-activity.js';
import { ZodFactory } from '$lib/util/zod-factory.js';

import { PassKind, PassVerdict, RejectionReason } from './verifier-run.js';

/**
 * Identifies a checklist the verifier scorer evaluated requirements
 * against. Client-safe mirror of the issuer-runner `ChecklistGroupRef`
 * (`$lib/server/domain/issuer-runner/issuer-runner-report.ts`); server
 * code converges on this shape.
 */
export const VerifierChecklistGroupRef = ZodFactory(
	z.object({
		kind: z.enum(['base', 'additive']),
		profileSlug: z.string(),
		profileName: z.string(),
		workflow: WorkflowSlug.schema,
		role: RoleSlug.schema
	})
);
export type VerifierChecklistGroupRef = ReturnType<typeof VerifierChecklistGroupRef>;

/**
 * The outcome of one requirement in a verifier run. Extends the base
 * check-outcome fields (client-safe mirror of the issuer-runner
 * `CheckOutcome`) with provenance:
 *
 * - `source: 'automated'` — the suite itself resolved the row.
 * - `source: 'attested'` — the row was scored from the operator's
 *   attestation of their verifier's decision; `attestation` carries the
 *   ground truth + verdict that feed the reveal and the attested marker
 *   in the UI.
 */
export const VerifierCheckOutcome = ZodFactory(
	z.object({
		id: z.string(),
		level: z.enum(['MUST', 'SHOULD', 'MAY']),
		status: z.enum(['pass', 'fail', 'warn', 'n/a']),
		message: z.string(),
		source: z.enum(['automated', 'attested']),
		attestation: z
			.object({
				passLabel: z.string(),
				kind: PassKind.schema,
				verdict: PassVerdict.schema,
				reason: RejectionReason.schema.optional()
			})
			.optional()
	})
);
export type VerifierCheckOutcome = ReturnType<typeof VerifierCheckOutcome>;

/**
 * The scored result of a verifier run, returned by the verifier-runner
 * score endpoint. `verified` is `true` iff no MUST
 * requirement across any group failed. `activity`/`artifacts` reuse the
 * normalized wallet shapes so the test-wallet panel consumes the report
 * directly.
 */
export const VerifierRunnerReport = ZodFactory(
	z.object({
		verified: z.boolean(),
		failingMustCount: z.number().int().nonnegative(),
		groups: z.array(
			z.object({
				checklist: VerifierChecklistGroupRef.schema,
				outcomes: z.array(VerifierCheckOutcome.schema)
			})
		),
		activity: z.array(WalletActivity.schema),
		artifacts: z.array(WalletArtifact.schema)
	})
);
export type VerifierRunnerReport = ReturnType<typeof VerifierRunnerReport>;

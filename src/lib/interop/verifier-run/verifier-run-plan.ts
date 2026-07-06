import { z } from 'zod';

import { ProfileSlug, WorkflowSlug } from '$lib/interop/profile-schema.js';
import { ZodFactory } from '$lib/util/zod-factory.js';

import { PassKind } from './verifier-run.js';

/**
 * One entry in a credential-less verifier run plan: the pass identity,
 * opaque label, and ground-truth kind — but no credential. Live-delivery
 * protocols (OID4VP) generate the credential fixture server-side at
 * present time, so the client never holds one up front. The UI hides
 * `kind` until the reveal after scoring, same trust model as
 * `PassDefinition`.
 */
export const VerifierRunPlanEntry = ZodFactory(
	z.object({
		passId: z.string().min(1),
		label: z.string().min(1),
		kind: PassKind.schema
	})
);
export type VerifierRunPlanEntry = ReturnType<typeof VerifierRunPlanEntry>;

/**
 * A complete credential-less verifier run plan: `VerifierRunDefinition`
 * with `entries` (no credentials) instead of `passes`. Stateless — the
 * server generates it, the client holds it and posts it back for
 * presenting and scoring.
 */
export const VerifierRunPlan = ZodFactory(
	z.object({
		runId: z.string().min(1),
		profile: ProfileSlug.schema,
		workflow: WorkflowSlug.schema,
		cryptosuite: z.string().min(1),
		entries: z.array(VerifierRunPlanEntry.schema)
	})
);
export type VerifierRunPlan = ReturnType<typeof VerifierRunPlan>;

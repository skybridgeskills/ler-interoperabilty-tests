import { z } from 'zod';

import { ProfileSlug, WorkflowSlug } from '$lib/interop/profile-schema.js';
import { ZodFactory } from '$lib/util/zod-factory.js';

/**
 * The kind of credential a verifier acceptance pass hands to the system
 * under test. The kind IS the ground truth the operator's attestation is
 * scored against.
 *
 * Design note: `'revoked'` joins this enum when status-list support
 * lands (the checklist row exists today and resolves `skipped` via the
 * scoring engine); keep this enum the single source of truth for pass
 * kinds.
 */
export const PassKind = ZodFactory(
	z.enum(['valid', 'broken-signature', 'schema-problem', 'expired'])
);
export type PassKind = ReturnType<typeof PassKind>;

/**
 * Why the operator's verifier rejected a credential, as reported in an
 * attestation. `other` covers rejections the operator cannot map to a
 * listed reason.
 */
export const RejectionReason = ZodFactory(z.enum(['signature', 'schema', 'expiry', 'other']));
export type RejectionReason = ReturnType<typeof RejectionReason>;

/** What the operator's verifier decided about one pass credential. */
export const PassVerdict = ZodFactory(z.enum(['accepted', 'rejected']));
export type PassVerdict = ReturnType<typeof PassVerdict>;

/**
 * One acceptance pass in a verifier run: an opaque label ("Credential 1"), the
 * signed credential to hand to the system under test, and the ground
 * truth `kind`. The client holds the full definition, but the UI hides
 * `kind` until the reveal after scoring.
 *
 * `credential` is absent for live-delivery protocols (OID4VP), where the
 * fixture is generated server-side at present time — see
 * `VerifierRunPlanEntry` for the client-held shape. (`z.unknown()`
 * already admitted absent values at parse time; `.optional()` makes the
 * static type match that runtime behavior.)
 */
export const PassDefinition = ZodFactory(
	z.object({
		passId: z.string().min(1),
		label: z.string().min(1),
		kind: PassKind.schema,
		credential: z.unknown().optional()
	})
);
export type PassDefinition = ReturnType<typeof PassDefinition>;

/**
 * A complete generated verifier run: which (profile, workflow) it
 * exercises, the cryptosuite the pass credentials are signed with, and
 * the ordered passes. Stateless — the server generates it, the client
 * holds it (ground truth included) and posts it back for scoring.
 */
export const VerifierRunDefinition = ZodFactory(
	z.object({
		runId: z.string().min(1),
		profile: ProfileSlug.schema,
		workflow: WorkflowSlug.schema,
		cryptosuite: z.string().min(1),
		passes: z.array(PassDefinition.schema)
	})
);
export type VerifierRunDefinition = ReturnType<typeof VerifierRunDefinition>;

/**
 * The operator's report of what their verifier decided for one pass.
 * `reason` is only meaningful alongside a `rejected` verdict; a wrong
 * reason downgrades the matching MUST row to `warn` during scoring.
 */
export const PassAttestation = ZodFactory(
	z.object({
		passId: z.string().min(1),
		verdict: PassVerdict.schema,
		reason: RejectionReason.schema.optional()
	})
);
export type PassAttestation = ReturnType<typeof PassAttestation>;

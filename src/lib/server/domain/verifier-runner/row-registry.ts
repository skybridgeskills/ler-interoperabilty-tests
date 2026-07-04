import type { ProfileSlug, WorkflowSlug } from '$lib/interop/profile-schema.js';
import type { PassKind } from '$lib/interop/verifier-run/index.js';

/**
 * The checklist row ids the scoring engine writes for one scorable
 * (profile, workflow) verifier combination: one acceptance row per pass
 * kind, plus the revoked row that exists in checklist content but has no
 * generated pass yet.
 */
export type VerifierRowIds = {
	/** Acceptance checklist row each pass kind is scored onto. */
	acceptance: Record<PassKind, string>;
	/** The revoked row — deferred until status-list support lands. */
	revoked: string;
};

const OB3_DIRECT_DELIVERY_ROW_IDS: VerifierRowIds = {
	acceptance: {
		valid: 'ob3-direct-delivery.verifier-accepts-valid-credential',
		'broken-signature': 'ob3-direct-delivery.verifier-rejects-broken-signature',
		'schema-problem': 'ob3-direct-delivery.verifier-rejects-schema-problem',
		expired: 'ob3-direct-delivery.verifier-rejects-expired'
	},
	revoked: 'ob3-direct-delivery.verifier-rejects-revoked'
};

const OID4_REQUEST_AND_VERIFICATION_ROW_IDS: VerifierRowIds = {
	acceptance: {
		valid: 'oid4.verifier-accepts-valid-credential',
		'broken-signature': 'oid4.verifier-rejects-broken-signature',
		'schema-problem': 'oid4.verifier-rejects-schema-problem',
		expired: 'oid4.verifier-rejects-expired'
	},
	revoked: 'oid4.verifier-rejects-revoked'
};

/**
 * Row ids per scorable (profile, workflow) verifier combination. A pair
 * absent here cannot be scored, even when a checklist exists for it —
 * adding a profile (e.g. VCALM in M3) means adding an entry, not a
 * refactor.
 */
export const VERIFIER_ROW_IDS: Partial<
	Record<ProfileSlug, Partial<Record<WorkflowSlug, VerifierRowIds>>>
> = {
	'ob3-direct-delivery': {
		'direct-credential-verification': OB3_DIRECT_DELIVERY_ROW_IDS
	},
	oid4: {
		'credential-request-and-verification': OID4_REQUEST_AND_VERIFICATION_ROW_IDS
	}
};

/**
 * Look up the row ids for a (profile, workflow), or `undefined` when the
 * combination is not scorable (the caller surfaces the mismatch error).
 */
export function verifierRowIdsFor(
	profile: ProfileSlug,
	workflow: WorkflowSlug
): VerifierRowIds | undefined {
	return VERIFIER_ROW_IDS[profile]?.[workflow];
}

/** Deferral note shown on the revoked row until status-list support lands (shared across profiles). */
export const REVOKED_DEFERRED_MESSAGE =
	'Revocation checks are not yet available in this suite — status-list support is planned.';

/**
 * Acceptance checklist row each pass kind is scored onto for the M1
 * direct-delivery combination. Kept as a named export for M1 callers;
 * new code should resolve rows via {@link verifierRowIdsFor}.
 */
export const ACCEPTANCE_ROW_ID: Record<PassKind, string> = OB3_DIRECT_DELIVERY_ROW_IDS.acceptance;

/**
 * The M1 direct-delivery revoked row id. Kept as a named export for M1
 * callers; new code should resolve rows via {@link verifierRowIdsFor}.
 */
export const REVOKED_ROW_ID = OB3_DIRECT_DELIVERY_ROW_IDS.revoked;

/**
 * Context handed to each per-requirement check function.
 *
 * - `credential` — the parsed credential JSON (untyped; checks
 *   defensively narrow what they touch).
 * - `verifierResult` — the result returned by `verifier-core` (lite
 *   shape; full type lives in phase 04's verifier-core-client).
 *
 * There was once an `includeAdditive` flag here, predating per-additive
 * selection: it was `true` when *any* additive was selected, and the
 * open-skill-alignment checks gated on it to return `'n/a'` when off. It is gone
 * (M11) — an additive group is only included when that specific additive is
 * selected, so the guard decided nothing, and under the scenario model a
 * scenario either names the additive or does not.
 */
export type CheckCtx = {
	credential: unknown;
	verifierResult: VerifierCoreResultLite;
};

/**
 * Minimal verifier-core result shape the check-runner depends on.
 * Phase 04 widens this and proves the real `verifier-core` output
 * satisfies it.
 */
export type VerifierCoreResultLite = {
	verified: boolean;
	log?: Array<{ id: string; valid: boolean; error?: { name?: string } }>;
};

/** What a check fn returns — the check-runner adds `id` + `level`. */
export type CheckResult = {
	status: 'pass' | 'fail' | 'warn' | 'n/a';
	message: string;
};

export type CheckFn = (ctx: CheckCtx) => CheckResult;

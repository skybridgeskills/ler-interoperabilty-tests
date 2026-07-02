/**
 * Context handed to each per-requirement check function.
 *
 * - `credential` — the parsed credential JSON (untyped; checks
 *   defensively narrow what they touch).
 * - `verifierResult` — the result returned by `verifier-core` (lite
 *   shape; full type lives in phase 04's verifier-core-client).
 * - `includeAdditive` — **legacy.** Predates per-additive selection.
 *   Set to `selected.length > 0` (i.e. `true` when ANY additive is
 *   selected) for back-compat with the open-skill-alignment checks,
 *   which still gate on it and return `'n/a'` when off. Newer additive
 *   checks (e.g. data-integrity-cryptosuites) ignore it: their group is
 *   only included when that specific additive is selected, so the guard
 *   is redundant for them.
 */
export type CheckCtx = {
	credential: unknown;
	verifierResult: VerifierCoreResultLite;
	includeAdditive: boolean;
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

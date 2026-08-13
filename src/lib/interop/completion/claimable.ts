import type { CompletionResult } from './evaluate.js';

/**
 * Whether the badge for a completion set can be claimed.
 *
 * **The governing rule of the whole widget: the meter fills exactly when the
 * badge becomes claimable.** They share a header, so any disagreement makes the
 * widget lie. This is therefore the *only* claimability predicate in the
 * codebase — the meter's fill and the claim affordance's enablement both come
 * from here, and neither re-derives `met === total` on its own.
 *
 * A set with no required obligations is **not** claimable: an empty meter that
 * reads "full" would award a badge for nothing.
 *
 * Optional memberships are ignored, by construction — they are not in
 * `met`/`total`. A blocked obligation keeps its requirements in `total` and
 * contributes nothing to `met`, so it blocks the badge rather than shrinking
 * what the badge means.
 */
export function isClaimable(result: CompletionResult): boolean {
	return result.total > 0 && result.met === result.total;
}

/**
 * Obligations the deployment cannot serve — what a blocked badge should explain.
 * Empty when nothing is blocked, which is the common case.
 */
export function blockedObligations(result: CompletionResult) {
	return result.obligations.filter((o) => o.blocked);
}

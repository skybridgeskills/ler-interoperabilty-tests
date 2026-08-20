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
 * Whether the **expanded ("Complete") tier's** badge can be claimed — the same
 * rule as {@link isClaimable}, applied to the `optional` sub-meter.
 *
 * The Complete badge is a *second, distinct* badge, claimed against the base
 * profile's `optional` set (M14). Its meter fill and its claim affordance both
 * read from here, so the two tiers each obey "the meter fills exactly when the
 * badge becomes claimable" independently. An empty optional set is never
 * claimable, exactly as an empty base set is not.
 */
export function isExpandedClaimable(result: CompletionResult): boolean {
	return result.optional.total > 0 && result.optional.met === result.optional.total;
}

/**
 * Obligations the deployment cannot serve — what a blocked badge should explain.
 * Empty when nothing is blocked, which is the common case.
 */
export function blockedObligations(result: CompletionResult) {
	return result.obligations.filter((o) => o.blocked);
}

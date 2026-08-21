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
 * The **Complete** tier's totals — Essential ∪ Expanded, and never add-on work.
 *
 * The one derivation both the Complete meter and the Complete claim read, so
 * the pair cannot disagree. Add-on work is absent by construction rather than
 * by filtering here: a scenario an additive claims takes `additive-only` in its
 * base profile, so `evaluateCompletion` never put it in either bucket.
 */
export function completeTotals(result: CompletionResult): { met: number; total: number } {
	return {
		met: result.met + result.optional.met,
		total: result.total + result.optional.total
	};
}

/**
 * Whether the **Complete** tier's badge can be claimed.
 *
 * Complete is **cumulative**: it means "everything this profile asks of this
 * role", so it is claimable only when the Essential set is full *and* the
 * Expanded set is full. It nests inside the Essential set rather than
 * partitioning against it.
 *
 * This corrects M14, which scored the Complete badge against the `optional` set
 * **alone**. Under that reading a Complete badge went claimable while the
 * Essential meter still read 0/13 — the widget offering a superset badge to
 * someone who had not done the subset.
 *
 * An **empty Expanded set is never claimable**: a base profile with no
 * `optional` scenario has no second badge to earn, and a meter that reads
 * "full" over nothing would award one for free. That is the same guard
 * {@link isClaimable} applies to an empty Essential set, and it is why this
 * cannot simply be `completeTotals` compared against itself.
 */
export function isExpandedClaimable(result: CompletionResult): boolean {
	if (result.optional.total === 0) return false;
	const { met, total } = completeTotals(result);
	return total > 0 && met === total;
}

/**
 * Obligations the deployment cannot serve — what a blocked badge should explain.
 * Empty when nothing is blocked, which is the common case.
 */
export function blockedObligations(result: CompletionResult) {
	return result.obligations.filter((o) => o.blocked);
}

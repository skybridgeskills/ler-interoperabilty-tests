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

/**
 * Whether an **add-on** badge can be claimed.
 *
 * Two conditions, and the second is the one that is easy to forget: the add-on's
 * own slice must be full, **and** the base profile-role's Essential set must be
 * too. An add-on layers on a base profile; claiming *"Data Integrity
 * Cryptosuites — VCALM Wallet"* while the VCALM Wallet Essential badge is unearned
 * would recognise the decoration and not the thing it decorates.
 *
 * Both results are passed explicitly rather than a precomputed `coreMet` flag.
 * The flag version is where a call site forgets, and this predicate is shared by
 * the homepage card, the profile page and the badge page — they agree today only
 * because they all read one function.
 *
 * Note the asymmetry with {@link isExpandedClaimable}: Expanded is cumulative and
 * so subsumes its floor arithmetically, while an add-on's slice is a *different*
 * completion set that cannot see the base profile's at all. Hence the second
 * argument.
 */
export function isAddOnClaimable(addOn: CompletionResult, core: CompletionResult): boolean {
	return isClaimable(addOn) && isClaimable(core);
}

/**
 * Why an add-on badge is not claimable — the distinction a single disabled
 * control cannot make.
 *
 * `'unfinished'` means the operator still has add-on work to do; `'core'` means
 * they have finished it and are gated on the base profile-role's Essential badge.
 * Those are different situations with different next actions, and telling them
 * apart is the whole reason this returns a reason rather than a boolean.
 */
export function addOnClaimBlocker(
	addOn: CompletionResult,
	core: CompletionResult
): 'unfinished' | 'core' | undefined {
	if (!isClaimable(addOn)) return 'unfinished';
	if (!isClaimable(core)) return 'core';
	return undefined;
}

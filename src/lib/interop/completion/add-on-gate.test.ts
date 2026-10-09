import { describe, expect, it } from 'vitest';

import type { ScenarioRunRecord } from '$lib/interop/scenario-run/index.js';

import { evaluateAdditiveSlice } from './additive-slice.js';
import { addOnClaimBlocker, isAddOnClaimable, isClaimable } from './claimable.js';
import { evaluateCompletion } from './evaluate.js';
import type { CompletionResult } from './evaluate.js';
import { completionGroupsForProfile } from './groups.js';

/**
 * **Acceptance criterion 3's gate** — *"an add-on badge is not claimable until
 * that profile-role's Essential badge is earned"* (owner: *"Addons also require
 * core"*).
 *
 * M15 P3 wrote {@link isAddOnClaimable} and {@link addOnClaimBlocker} and P7
 * rendered the add-on cards, but nothing connected them: the card gated on its
 * own slice through `isClaimable`, so a full add-on slice offered a live claim
 * control over an unearned core badge. Found in P8, wired, and asserted here —
 * both the predicate and the fact that the card actually carries what the
 * predicate needs.
 */

/** A result with every obligation met, or none — the two ends the gate turns on. */
function resultLike(met: boolean): CompletionResult {
	const obligation = {
		obligation: { kind: 'scenario' as const, scenario: { slug: 's' } },
		met: met ? 1 : 0,
		total: 1,
		status: met ? ('pass' as const) : ('not-run' as const)
	} as unknown as CompletionResult['obligations'][number];
	return {
		met: met ? 1 : 0,
		total: 1,
		obligations: [obligation],
		optional: { met: 0, total: 0, obligations: [] }
	} as unknown as CompletionResult;
}

const full = resultLike(true);
const empty = resultLike(false);

describe('isAddOnClaimable', () => {
	it('needs BOTH the add-on slice and the core meter full', () => {
		expect(isAddOnClaimable(full, full)).toBe(true);
		expect(isAddOnClaimable(full, empty)).toBe(false);
		expect(isAddOnClaimable(empty, full)).toBe(false);
		expect(isAddOnClaimable(empty, empty)).toBe(false);
	});

	it('is STRICTLY stronger than the slice’s own claimability', () => {
		// The regression this file exists for: a full slice over an unearned core
		// is claimable by `isClaimable` and must not be by the add-on predicate.
		expect(isClaimable(full)).toBe(true);
		expect(isAddOnClaimable(full, empty)).toBe(false);
	});
});

describe('addOnClaimBlocker', () => {
	it('says `unfinished` for the add-on’s own work and `core` for the badge underneath', () => {
		expect(addOnClaimBlocker(empty, empty)).toBe('unfinished');
		expect(addOnClaimBlocker(empty, full)).toBe('unfinished');
		// Finished the add-on, gated on core — the state the card explains in words.
		expect(addOnClaimBlocker(full, empty)).toBe('core');
		expect(addOnClaimBlocker(full, full)).toBeUndefined();
	});
});

describe('the add-on card carries what the gate needs', () => {
	const runs: Record<string, ScenarioRunRecord> = {};

	it('gives every add-on group a `coreResult`, and no base group one', () => {
		// Without `coreResult` on the card the gate silently degrades to
		// `isClaimable(slice)` — which is exactly the defect, and it would not have
		// shown up as a type error.
		const addOnGroups = completionGroupsForProfile({
			profileSlug: 'data-integrity-cryptosuites',
			profileName: 'Data Integrity Cryptosuites',
			runs
		});
		expect(addOnGroups.length).toBeGreaterThan(0);
		for (const group of addOnGroups) {
			expect(group.addOn, `${group.profileSlug}:${group.roleSlug}`).toBeDefined();
			expect(group.coreResult, `${group.profileSlug}:${group.roleSlug}`).toBeDefined();
		}

		const baseGroups = completionGroupsForProfile({
			profileSlug: 'oid4',
			profileName: 'OID4',
			runs
		});
		for (const group of baseGroups) {
			expect(group.coreResult, `${group.profileSlug}:${group.roleSlug}`).toBeUndefined();
		}
	});

	it('carries the core meter of its OWN (base profile, role), not some other card’s', () => {
		const groups = completionGroupsForProfile({
			profileSlug: 'data-integrity-cryptosuites',
			profileName: 'Data Integrity Cryptosuites',
			runs
		});
		for (const group of groups) {
			const expected = evaluateCompletion({
				profile: group.profileSlug as 'oid4',
				role: group.roleSlug,
				runs
			});
			expect(group.coreResult?.total, `${group.profileSlug}:${group.roleSlug}`).toBe(
				expected.total
			);
		}
	});

	it('renders every add-on card as blocked on an empty run history', () => {
		// Nothing is run, so every card is `unfinished` — and critically, none is
		// claimable. A card that came back claimable here would mean the slice was
		// empty and `sliceIsEmpty` failed to drop it.
		const groups = completionGroupsForProfile({
			profileSlug: 'data-integrity-cryptosuites',
			profileName: 'Data Integrity Cryptosuites',
			runs
		});
		for (const group of groups) {
			expect(isAddOnClaimable(group.result, group.coreResult!), group.profileSlug).toBe(false);
		}
	});

	it('agrees with `evaluateAdditiveSlice` about what the slice is', () => {
		// The card's `result` must be the same set the add-on badge scores, or the
		// meter and the badge disagree.
		const groups = completionGroupsForProfile({
			profileSlug: 'data-integrity-cryptosuites',
			profileName: 'Data Integrity Cryptosuites',
			runs
		});
		for (const group of groups) {
			const slice = evaluateAdditiveSlice({
				additive: 'data-integrity-cryptosuites',
				baseProfile: group.profileSlug as 'oid4',
				role: group.roleSlug,
				runs
			});
			expect(group.result.total, `${group.profileSlug}:${group.roleSlug}`).toBe(slice.total);
		}
	});
});

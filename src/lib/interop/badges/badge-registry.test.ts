import { describe, expect, it } from 'vitest';

import { completionGroups } from '$lib/interop/completion/index.js';
import { allAdditiveProfiles } from '$lib/interop/index.js';

import { scenariosBehindBadge } from './accessors.js';
import { badgeFingerprint } from './badge-fingerprint.js';
import {
	addOnBadgeFor,
	badgeDefinitions,
	essentialBadgeFor,
	expandedBadgeFor
} from './badge-registry.js';
import { BadgeTier } from './badge-schema.js';

/**
 * The registry against the catalog (M15 P7).
 *
 * The registry held **two** badges from M8 until M15 while the catalog grew to
 * thirty-two scenarios, so every add-on card and most base cards rendered a
 * disabled claim control. These tests are what stop that recurring: they derive
 * the expected set from the catalog and fail when the registry falls behind.
 */

const allAdditiveSlugs = allAdditiveProfiles.map((p) => p.slug);

/** Every group the app can render, with the add-on slices a reader could select. */
const renderableGroups = () => completionGroups({ runs: {}, additives: allAdditiveSlugs });

describe('the registry covers the catalog', () => {
	it('registers an Essential badge for every renderable (profile, role) group', () => {
		// The acceptance criterion: no claim control on any card is dead. A pair with
		// no badge is a finding — weaken this test and the gap comes straight back.
		const missing = renderableGroups()
			.filter((group) => essentialBadgeFor(group.profileSlug, group.roleSlug) === undefined)
			.map((group) => `${group.profileSlug}:${group.roleSlug}`);
		expect(missing).toEqual([]);
	});

	it('registers an add-on badge for every add-on slice a card can show', () => {
		const missing: string[] = [];
		for (const group of renderableGroups()) {
			for (const slice of group.additives) {
				if (addOnBadgeFor(slice.slug, group.profileSlug, group.roleSlug) === undefined) {
					missing.push(`${slice.slug}:${group.profileSlug}:${group.roleSlug}`);
				}
			}
		}
		expect(missing).toEqual([]);
	});

	it('registers an Expanded badge exactly where the optional set is non-empty', () => {
		// An Expanded badge over nothing would be claimable the instant its Essential
		// was — a second badge awarded for no additional work. So the registration
		// must track the tier's contents in BOTH directions.
		for (const group of renderableGroups()) {
			const registered = expandedBadgeFor(group.profileSlug, group.roleSlug) !== undefined;
			const hasOptional = group.result.optional.obligations.length > 0;
			expect(registered, `${group.profileSlug}:${group.roleSlug}`).toBe(hasOptional);
		}
	});
});

describe('every registered badge is well-formed', () => {
	const all = Object.values(badgeDefinitions);

	it('names a NON-empty scenario set', () => {
		const empty = all
			.filter((badge) => scenariosBehindBadge(badge).length === 0)
			.map((badge) => badge.slug);
		expect(empty).toEqual([]);
	});

	it('has a unique, kebab-case slug', () => {
		const slugs = all.map((b) => b.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
		for (const slug of slugs) expect(slug, slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
	});

	it('uses only the Essential / Expanded / add-on tier vocabulary', () => {
		// M15's acceptance criterion 8, pinned. `base`/`complete`/`additive` were the
		// M8–M14 names and survive in no definition; the enum makes a stale one a
		// compile error, and this makes a stale one a test failure too, which is the
		// half a `git grep` cannot give you.
		expect(BadgeTier.schema.options).toEqual(['essential', 'expanded', 'add-on']);
		for (const badge of all) {
			expect(['essential', 'expanded', 'add-on'], badge.slug).toContain(badge.tier);
		}
	});

	it('carries copy that says what it is and what the bar was', () => {
		for (const badge of all) {
			expect(badge.name.length, badge.slug).toBeGreaterThan(0);
			// Not filler: this ends up in a credential in someone's wallet.
			expect(badge.description.length, badge.slug).toBeGreaterThan(80);
			expect(badge.criteriaSummary.length, badge.slug).toBeGreaterThan(60);
			// Self-attested — the copy must not imply an audit.
			expect(badge.criteriaSummary, badge.slug).toMatch(/self-verified/i);
		}
	});

	it('keeps add-on badge sets DISJOINT across base profiles', () => {
		// The whole of M15's re-keying, asserted against the real catalog rather than
		// a fixture: DIC VCALM Wallet and DIC OID4 Wallet share no scenario.
		const addOns = all.filter((b) => b.tier === 'add-on');
		for (const a of addOns) {
			for (const b of addOns) {
				if (a.slug === b.slug) continue;
				if (a.tier !== 'add-on' || b.tier !== 'add-on') continue;
				if (a.additiveProfile !== b.additiveProfile || a.role !== b.role) continue;
				const setA = new Set(scenariosBehindBadge(a).map((s) => s.slug));
				const shared = scenariosBehindBadge(b).filter((s) => setA.has(s.slug));
				expect(
					shared.map((s) => s.slug),
					`${a.slug} vs ${b.slug}`
				).toEqual([]);
			}
		}
	});

	it('fingerprints stably, so copy edits never invalidate a claim', () => {
		for (const badge of all) {
			const reworded = { ...badge, name: `${badge.name} (reworded)` };
			expect(badgeFingerprint(reworded), badge.slug).toBe(badgeFingerprint(badge));
		}
	});
});

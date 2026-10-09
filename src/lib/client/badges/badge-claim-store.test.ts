import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BadgeClaimSnapshot } from '$lib/interop/badges/index.js';

import {
	allBadgeClaims,
	clearBadgeClaims,
	latestClaimFor,
	recordBadgeClaim
} from './badge-claim-store.js';

const STORAGE_KEY = 'lits.badges.v1';

let backing: Map<string, string>;

beforeEach(() => {
	backing = new Map<string, string>();
	vi.stubGlobal('localStorage', {
		getItem: (k: string) => backing.get(k) ?? null,
		setItem: (k: string, v: string) => void backing.set(k, v),
		removeItem: (k: string) => void backing.delete(k),
		clear: () => backing.clear()
	});
});

afterEach(() => vi.unstubAllGlobals());

/** A snapshot for the base badge, current unless told otherwise. */
function snapshot(over: Partial<BadgeClaimSnapshot> = {}): BadgeClaimSnapshot {
	return BadgeClaimSnapshot({
		badgeSlug: 'oid4-wallet',
		claimedAt: '2026-08-03T09:00:00.000Z',
		fingerprint: 'abcd1234',
		requirementIds: ['aaa-refused', 'stored'],
		...over
	});
}

describe('recordBadgeClaim', () => {
	it('round-trips a snapshot through latestClaimFor', () => {
		recordBadgeClaim(snapshot());

		expect(latestClaimFor('oid4-wallet')).toEqual(snapshot());
	});

	it('stores an array, not a keyed map', () => {
		recordBadgeClaim(snapshot());

		expect(Array.isArray(JSON.parse(backing.get(STORAGE_KEY)!))).toBe(true);
	});

	it('is idempotent on (badgeSlug, claimedAt) — a double write does not duplicate', () => {
		recordBadgeClaim(snapshot());
		recordBadgeClaim(snapshot());

		expect(allBadgeClaims()).toHaveLength(1);
	});

	it('adds a second snapshot for a different claimedAt, and latestClaimFor returns the newer', () => {
		recordBadgeClaim(snapshot({ claimedAt: '2026-08-03T09:00:00.000Z' }));
		recordBadgeClaim(snapshot({ claimedAt: '2026-08-10T09:00:00.000Z' }));

		expect(allBadgeClaims()).toHaveLength(2);
		expect(latestClaimFor('oid4-wallet')?.claimedAt).toBe('2026-08-10T09:00:00.000Z');
	});

	it('keeps claims for different badges apart', () => {
		recordBadgeClaim(snapshot());
		recordBadgeClaim(snapshot({ badgeSlug: 'some-other-badge' }));

		expect(latestClaimFor('oid4-wallet')?.badgeSlug).toBe('oid4-wallet');
		expect(latestClaimFor('some-other-badge')?.badgeSlug).toBe('some-other-badge');
	});
});

describe('never drift-drops (the anti-drift design)', () => {
	it('returns a snapshot for a badge the catalog no longer holds', () => {
		recordBadgeClaim(snapshot({ badgeSlug: 'retired-badge' }));

		expect(latestClaimFor('retired-badge')?.badgeSlug).toBe('retired-badge');
		expect(allBadgeClaims()).toHaveLength(1);
	});

	it('returns a snapshot whose fingerprint no longer matches the live badge', () => {
		recordBadgeClaim(snapshot({ fingerprint: 'deadbeef' }));

		// A run record would drop here; a claim never does.
		expect(latestClaimFor('oid4-wallet')?.fingerprint).toBe('deadbeef');
	});
});

describe('reading a damaged store', () => {
	it('returns an empty array for invalid JSON rather than throwing', () => {
		backing.set(STORAGE_KEY, 'not json');

		expect(allBadgeClaims()).toEqual([]);
	});

	it('returns an empty array when the payload is not an array', () => {
		backing.set(STORAGE_KEY, JSON.stringify({ not: 'an array' }));

		expect(allBadgeClaims()).toEqual([]);
	});

	it('drops a malformed entry and keeps its valid siblings', () => {
		backing.set(STORAGE_KEY, JSON.stringify([snapshot(), { nope: 1 }]));

		expect(allBadgeClaims()).toHaveLength(1);
		expect(allBadgeClaims()[0].badgeSlug).toBe('oid4-wallet');
	});

	it('is empty before anything is written', () => {
		expect(allBadgeClaims()).toEqual([]);
		expect(latestClaimFor('oid4-wallet')).toBeUndefined();
	});
});

describe('SSR safety', () => {
	it('does not throw when localStorage is absent', () => {
		vi.stubGlobal('localStorage', undefined);

		expect(() => recordBadgeClaim(snapshot())).not.toThrow();
		expect(allBadgeClaims()).toEqual([]);
		expect(() => clearBadgeClaims()).not.toThrow();
	});
});

describe('clearBadgeClaims', () => {
	it('removes everything', () => {
		recordBadgeClaim(snapshot());
		clearBadgeClaims();

		expect(allBadgeClaims()).toEqual([]);
	});
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Scenario, scenarioFingerprint } from '$lib/interop/scenarios/index.js';

const STORAGE_KEY = 'lits.scenario-runs.v1';

// The store reads the live catalog to drift-check what it loads. Stand a small
// one in place of the real (still empty) registry.
const catalog = vi.hoisted(() => {
	const scenario = (slug: string) => ({
		slug,
		name: 'Accept a well-formed credential',
		blurb: 'The happy path.',
		role: 'wallet' as const,
		workflow: 'credential-acceptance' as const,
		memberships: [{ profile: 'oid4' as const, level: 'required' as const }],
		steps: [
			{
				id: 'offer',
				title: 'Offer the credential',
				summary: 'We will issue your wallet a credential.',
				action: { kind: 'issue' as const, credential: 'minimal-ob3' },
				requirements: [
					{
						id: 'stored',
						statement: 'The credential appears in your wallet’s list.',
						level: 'MUST' as const,
						check: { kind: 'attested' as const, answer: { kind: 'affirm' as const } }
					}
				]
			}
		]
	});
	return [scenario('oid4-wallet-acceptance'), scenario('oid4-wallet-presentation')];
});

vi.mock('$lib/interop/scenarios/all-scenarios.js', () => ({ allScenarios: catalog }));

const { allScenarioRuns, clearScenarioRuns, recordScenarioRun, scenarioRunFor } =
	await import('./scenario-run-store.js');

const live = Scenario(catalog[0]);

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

/** A record for the live catalog's first scenario, current unless told otherwise. */
function record(over: Record<string, unknown> = {}) {
	return {
		scenarioSlug: 'oid4-wallet-acceptance',
		ranAt: '2026-08-13T10:00:00.000Z',
		fingerprint: scenarioFingerprint(live),
		status: 'passed' as const,
		outcomes: {
			stored: {
				requirementId: 'stored',
				level: 'MUST' as const,
				status: 'pass' as const,
				source: 'attested' as const
			}
		},
		attempts: 1,
		...over
	};
}

describe('recordScenarioRun', () => {
	it('stores one record per scenario, keyed by slug', () => {
		recordScenarioRun(record());

		expect(Object.keys(allScenarioRuns())).toEqual(['oid4-wallet-acceptance']);
	});

	it('replaces the previous result rather than appending — one result per scenario', () => {
		recordScenarioRun(record());
		recordScenarioRun(record({ status: 'failed' }));

		expect(scenarioRunFor('oid4-wallet-acceptance')?.status).toBe('failed');
		expect(Object.keys(allScenarioRuns())).toHaveLength(1);
	});

	it('increments `attempts` itself, so no caller can get the count wrong', () => {
		recordScenarioRun(record());
		expect(scenarioRunFor('oid4-wallet-acceptance')?.attempts).toBe(1);

		recordScenarioRun(record());
		expect(scenarioRunFor('oid4-wallet-acceptance')?.attempts).toBe(2);

		// Even if a caller hands in a stale count.
		recordScenarioRun(record({ attempts: 1 }));
		expect(scenarioRunFor('oid4-wallet-acceptance')?.attempts).toBe(3);
	});

	it('counts attempts per scenario, not store-wide', () => {
		recordScenarioRun(record());
		recordScenarioRun(record());
		recordScenarioRun(record({ scenarioSlug: 'oid4-wallet-presentation' }));

		expect(scenarioRunFor('oid4-wallet-acceptance')?.attempts).toBe(2);
		expect(scenarioRunFor('oid4-wallet-presentation')?.attempts).toBe(1);
	});

	it('stores a flat map, not an array per bucket', () => {
		recordScenarioRun(record());

		const raw = JSON.parse(backing.get(STORAGE_KEY)!);
		expect(Array.isArray(raw['oid4-wallet-acceptance'])).toBe(false);
	});
});

describe('the old stores', () => {
	it('removes both legacy keys on first write, with no migration', () => {
		backing.set('lits.run-history.v2', '{"wallet:credential-acceptance:oid4":[]}');
		backing.set('lits.run-history.v1', '{}');

		recordScenarioRun(record());

		expect(backing.has('lits.run-history.v2')).toBe(false);
		expect(backing.has('lits.run-history.v1')).toBe(false);
	});

	it('never reads them — a v2 store alone yields nothing', () => {
		backing.set('lits.run-history.v2', '{"wallet:credential-acceptance:oid4":[{"id":"x"}]}');

		expect(allScenarioRuns()).toEqual({});
	});
});

describe('drift', () => {
	it('drops a record whose fingerprint no longer matches the live scenario', () => {
		recordScenarioRun(record({ fingerprint: 'deadbeef' }));

		// The row simply reverts to "not run". There is no `outdated` state.
		expect(scenarioRunFor('oid4-wallet-acceptance')).toBeUndefined();
		expect(allScenarioRuns()).toEqual({});
	});

	it('drops per scenario, leaving current records alone', () => {
		recordScenarioRun(record());
		recordScenarioRun(record({ scenarioSlug: 'oid4-wallet-presentation', fingerprint: 'stale' }));

		expect(Object.keys(allScenarioRuns())).toEqual(['oid4-wallet-acceptance']);
	});

	it('drops a record for a slug the catalog no longer holds', () => {
		recordScenarioRun(record({ scenarioSlug: 'retired-scenario' }));

		expect(allScenarioRuns()).toEqual({});
	});
});

describe('reading a damaged store', () => {
	it('returns an empty map for invalid JSON rather than throwing', () => {
		backing.set(STORAGE_KEY, 'not json');

		expect(allScenarioRuns()).toEqual({});
	});

	it('returns an empty map when the payload is an array', () => {
		backing.set(STORAGE_KEY, '[]');

		expect(allScenarioRuns()).toEqual({});
	});

	it('drops a malformed entry and keeps its valid siblings', () => {
		backing.set(
			STORAGE_KEY,
			JSON.stringify({
				'oid4-wallet-acceptance': record(),
				'oid4-wallet-presentation': { nope: 1 }
			})
		);

		expect(Object.keys(allScenarioRuns())).toEqual(['oid4-wallet-acceptance']);
	});

	it('is empty before anything is written', () => {
		expect(allScenarioRuns()).toEqual({});
		expect(scenarioRunFor('oid4-wallet-acceptance')).toBeUndefined();
	});
});

describe('SSR safety', () => {
	it('does not throw when localStorage is absent', () => {
		vi.stubGlobal('localStorage', undefined);

		expect(() => recordScenarioRun(record())).not.toThrow();
		expect(allScenarioRuns()).toEqual({});
		expect(() => clearScenarioRuns()).not.toThrow();
	});
});

describe('clearScenarioRuns', () => {
	it('removes everything', () => {
		recordScenarioRun(record());
		clearScenarioRuns();

		expect(allScenarioRuns()).toEqual({});
	});
});

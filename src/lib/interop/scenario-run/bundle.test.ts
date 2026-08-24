import { describe, expect, it, vi } from 'vitest';

import { BadgeClaimSnapshot } from '$lib/interop/badges/index.js';
import { Scenario, scenarioFingerprint } from '$lib/interop/scenarios/index.js';

// The bundle transforms consult the live catalog to drift-check what they import.
// Stand a small one in place of the real (still empty) registry.
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

const { applyBundle, buildBundle, parseBundle, ResultBundle } = await import('./bundle.js');

const acceptance = scenarioFingerprint(Scenario(catalog[0]));
const presentation = scenarioFingerprint(Scenario(catalog[1]));

/** A record for a live catalog scenario, current unless told otherwise. */
function record(slug: string, fingerprint: string, over: Record<string, unknown> = {}) {
	return {
		scenarioSlug: slug,
		ranAt: '2026-08-13T10:00:00.000Z',
		fingerprint,
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

function claim(badgeSlug: string, claimedAt: string): BadgeClaimSnapshot {
	return BadgeClaimSnapshot({ badgeSlug, claimedAt, fingerprint: 'fp', requirementIds: [] });
}

const empty = { results: {}, badges: [] };

describe('buildBundle', () => {
	it('wraps the stores in the envelope, verbatim', () => {
		const results = { 'oid4-wallet-acceptance': record('oid4-wallet-acceptance', acceptance) };
		const badges = [claim('oid4-wallet', '2026-08-13T10:00:00.000Z')];

		const bundle = buildBundle({ results, badges }, '2026-08-19T00:00:00.000Z');

		expect(bundle.format).toBe('lits.scenario-results');
		expect(bundle.version).toBe(1);
		expect(bundle.exportedAt).toBe('2026-08-19T00:00:00.000Z');
		// results byte-identical to the store's map — same keys, same record shape.
		expect(bundle.results).toEqual(results);
		expect(bundle.badges).toEqual(badges);
	});

	it('round-trips through the schema — everything it holds is serialisable', () => {
		const bundle = buildBundle(
			{
				results: { 'oid4-wallet-acceptance': record('oid4-wallet-acceptance', acceptance) },
				badges: [claim('oid4-wallet', '2026-08-13T10:00:00.000Z')]
			},
			'2026-08-19T00:00:00.000Z'
		);

		expect(ResultBundle(JSON.parse(JSON.stringify(bundle)))).toEqual(bundle);
	});
});

describe('applyBundle — results', () => {
	it('replaces per scenario, incoming copy wins', () => {
		const current = {
			results: { 'oid4-wallet-acceptance': record('oid4-wallet-acceptance', acceptance) },
			badges: []
		};
		const bundle = buildBundle(
			{
				results: {
					'oid4-wallet-acceptance': record('oid4-wallet-acceptance', acceptance, {
						status: 'failed'
					})
				},
				badges: []
			},
			'now'
		);

		const next = applyBundle(bundle, current);

		expect(next.results['oid4-wallet-acceptance'].status).toBe('failed');
	});

	it('leaves scenarios absent from the bundle untouched', () => {
		const current = {
			results: { 'oid4-wallet-acceptance': record('oid4-wallet-acceptance', acceptance) },
			badges: []
		};
		const bundle = buildBundle(
			{
				results: { 'oid4-wallet-presentation': record('oid4-wallet-presentation', presentation) },
				badges: []
			},
			'now'
		);

		const next = applyBundle(bundle, current);

		expect(Object.keys(next.results).sort()).toEqual([
			'oid4-wallet-acceptance',
			'oid4-wallet-presentation'
		]);
		expect(next.results['oid4-wallet-acceptance'].status).toBe('passed');
	});

	it('drops an incoming record whose fingerprint has drifted', () => {
		const bundle = buildBundle(
			{
				results: { 'oid4-wallet-acceptance': record('oid4-wallet-acceptance', 'deadbeef') },
				badges: []
			},
			'now'
		);

		expect(applyBundle(bundle, empty).results).toEqual({});
	});

	it('drops an incoming record whose slug the catalog no longer holds', () => {
		const bundle = buildBundle(
			{ results: { 'retired-scenario': record('retired-scenario', acceptance) }, badges: [] },
			'now'
		);

		expect(applyBundle(bundle, empty).results).toEqual({});
	});

	it('drops a malformed incoming entry rather than throwing', () => {
		// A bundle-shaped object whose results carry one good and one junk entry.
		const bundle = {
			format: 'lits.scenario-results' as const,
			version: 1 as const,
			exportedAt: 'now',
			results: {
				'oid4-wallet-acceptance': record('oid4-wallet-acceptance', acceptance),
				'oid4-wallet-presentation': { nope: 1 } as never
			},
			badges: []
		};

		const next = applyBundle(bundle, empty);

		expect(Object.keys(next.results)).toEqual(['oid4-wallet-acceptance']);
	});
});

describe('applyBundle — badges', () => {
	it('merges additively — an existing local claim is never erased', () => {
		const current = { results: {}, badges: [claim('oid4-wallet', '2026-01-01T00:00:00.000Z')] };
		const bundle = buildBundle(
			{ results: {}, badges: [claim('oid4-wallet-complete', '2026-02-02T00:00:00.000Z')] },
			'now'
		);

		const next = applyBundle(bundle, current);

		expect(next.badges.map((b) => b.badgeSlug).sort()).toEqual([
			'oid4-wallet',
			'oid4-wallet-complete'
		]);
	});

	it('deduplicates by (badgeSlug, claimedAt)', () => {
		const at = '2026-01-01T00:00:00.000Z';
		const current = { results: {}, badges: [claim('oid4-wallet', at)] };
		const bundle = buildBundle({ results: {}, badges: [claim('oid4-wallet', at)] }, 'now');

		expect(applyBundle(bundle, current).badges).toHaveLength(1);
	});

	it('keeps a re-claim — same badge, different claimedAt is a new snapshot', () => {
		const current = { results: {}, badges: [claim('oid4-wallet', '2026-01-01T00:00:00.000Z')] };
		const bundle = buildBundle(
			{ results: {}, badges: [claim('oid4-wallet', '2026-03-03T00:00:00.000Z')] },
			'now'
		);

		expect(applyBundle(bundle, current).badges).toHaveLength(2);
	});
});

describe('parseBundle', () => {
	it('accepts a well-formed bundle', () => {
		const bundle = buildBundle({ results: {}, badges: [] }, 'now');

		const parsed = parseBundle(JSON.parse(JSON.stringify(bundle)));

		expect(parsed.ok).toBe(true);
	});

	it('rejects a wrong format with a clear message', () => {
		const parsed = parseBundle({ format: 'something-else', version: 1, results: {}, badges: [] });

		expect(parsed).toEqual({ ok: false, error: 'This file is not a results bundle.' });
	});

	it('rejects an unsupported version, naming it', () => {
		const parsed = parseBundle({
			format: 'lits.scenario-results',
			version: 2,
			exportedAt: 'now',
			results: {},
			badges: []
		});

		expect(parsed.ok).toBe(false);
		if (!parsed.ok) expect(parsed.error).toContain('version');
	});

	it('rejects a non-object', () => {
		expect(parseBundle('nope').ok).toBe(false);
		expect(parseBundle(null).ok).toBe(false);
		expect(parseBundle([]).ok).toBe(false);
	});
});

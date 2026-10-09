import { describe, expect, it } from 'vitest';

import { evaluateCompletion } from '$lib/interop/completion/index.js';

import { scenarioBySlug } from './accessors.js';

/**
 * The Complete tier's proof scenario. It must be `optional` in `oid4`/wallet (so
 * it lands in the expanded sub-meter, not the base one), offer the decorated
 * `rich-ob3` credential, and — because rendering is not wire-visible — carry one
 * automatic MUST and attested SHOULDs for the display facets.
 */
describe('oid4-wallet-faithful-rendering', () => {
	const scenario = scenarioBySlug('oid4-wallet-faithful-rendering')!;

	it('is optional in the oid4 base profile, wallet role', () => {
		expect(scenario.role).toBe('wallet');
		expect(scenario.memberships).toEqual([{ profile: 'oid4', level: 'optional' }]);
	});

	it('offers the decorated rich-ob3 credential', () => {
		expect(scenario.steps[0].action).toEqual({ kind: 'issue', credential: 'rich-ob3' });
	});

	it('checks the wire once (MUST) and attests the display facets (SHOULD)', () => {
		const reqs = scenario.steps.flatMap((s) => s.requirements);
		const musts = reqs.filter((r) => r.level === 'MUST');
		const shoulds = reqs.filter((r) => r.level === 'SHOULD');
		expect(musts).toHaveLength(1);
		expect(musts[0].check.kind).toBe('automatic');
		expect(shoulds.length).toBeGreaterThanOrEqual(2);
		expect(shoulds.every((r) => r.check.kind === 'attested')).toBe(true);
	});

	it('populates the oid4/wallet optional sub-meter, not the base meter', () => {
		const result = evaluateCompletion({ profile: 'oid4', role: 'wallet', runs: {} });
		expect(result.optional.total).toBeGreaterThan(0);

		// This scenario is IN the optional (Expanded) set, and its requirements are
		// counted there. It was the only member until M15 P6 added the conduct
		// scenarios — the first real population of an Expanded tier — so this asserts
		// membership and its own contribution rather than a total that now grows
		// whenever the tier does.
		const optionalSlugs = result.optional.obligations.flatMap((o) =>
			o.obligation.kind === 'scenario' ? [o.obligation.scenario.slug] : []
		);
		expect(optionalSlugs).toContain(scenario.slug);

		const ownReqCount = scenario.steps.flatMap((s) => s.requirements).length;
		const own = result.optional.obligations.find(
			(o) => o.obligation.kind === 'scenario' && o.obligation.scenario.slug === scenario.slug
		)!;
		expect(own.total).toBe(ownReqCount);

		// And none of it reaches the base (Essential) meter.
		const baseSlugs = result.obligations.flatMap((o) =>
			o.obligation.kind === 'scenario' ? [o.obligation.scenario.slug] : []
		);
		expect(baseSlugs).not.toContain(scenario.slug);
	});
});

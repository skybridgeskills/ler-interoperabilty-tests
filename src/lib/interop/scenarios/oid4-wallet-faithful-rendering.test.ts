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
		// The base (required) meter counts only the two required scenarios' reqs.
		expect(result.optional.total).toBeGreaterThan(0);
		expect(result.optional.obligations.map((o) => o.obligation)).toHaveLength(1);
		// This scenario's requirements are not in the base total.
		const optionalReqCount = scenario.steps.flatMap((s) => s.requirements).length;
		expect(result.optional.total).toBe(optionalReqCount);
	});
});

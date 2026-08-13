import { describe, expect, it, vi } from 'vitest';

import type { ScenarioRunRecord } from '$lib/interop/scenario-run/index.js';

/**
 * A catalog exercising every membership level at once:
 *
 * - `acceptance` — required in `oid4`, two requirements
 * - `presentation` — required in `oid4`, one requirement
 * - `rich-content` — **optional** in `oid4`, one requirement
 * - `eddsa` / `ecdsa` — a `oneOf` group in `oid4`, sharing requirement ids
 * - `issuer-side` — required in `oid4` but for a different role
 */
const catalog = vi.hoisted(() => {
	const requirement = (id: string) => ({
		id,
		statement: 'It worked.',
		level: 'MUST' as const,
		check: { kind: 'automatic' as const, checkId: 'exchange-reached-complete' }
	});
	const scenario = (
		slug: string,
		level: unknown,
		requirementIds: string[],
		role: 'wallet' | 'issuer' = 'wallet'
	) => ({
		slug,
		name: slug,
		blurb: '',
		role,
		workflow: 'credential-acceptance' as const,
		memberships: [{ profile: 'oid4' as const, level }],
		steps: [
			{
				id: 'offer',
				title: 'Offer',
				summary: '',
				requirements: requirementIds.map(requirement)
			}
		]
	});

	return [
		scenario('acceptance', 'required', ['a1', 'a2']),
		scenario('presentation', 'required', ['p1']),
		scenario('rich-content', 'optional', ['r1']),
		scenario('eddsa', { oneOf: 'producer-floor' }, ['c1', 'c2']),
		scenario('ecdsa', { oneOf: 'producer-floor' }, ['c1', 'c2']),
		scenario('issuer-side', 'required', ['i1'], 'issuer')
	];
});

vi.mock('$lib/interop/scenarios/all-scenarios.js', () => ({ allScenarios: catalog }));

const { evaluateCompletion } = await import('./evaluate.js');
const { isClaimable } = await import('./claimable.js');

/** A stored run where the named requirement ids passed and the rest did not. */
function run(slug: string, passed: string[], failed: string[] = []): ScenarioRunRecord {
	const outcome = (id: string, status: 'pass' | 'fail') => [
		id,
		{ requirementId: id, level: 'MUST' as const, status, source: 'automated' as const }
	];
	return {
		scenarioSlug: slug,
		ranAt: '2026-08-13T10:00:00.000Z',
		fingerprint: 'fp',
		status: failed.length ? 'failed' : 'passed',
		outcomes: Object.fromEntries([
			...passed.map((id) => outcome(id, 'pass')),
			...failed.map((id) => outcome(id, 'fail'))
		]),
		attempts: 1
	};
}

const evaluate = (runs: Record<string, ScenarioRunRecord>, blocked = {}) =>
	evaluateCompletion({ profile: 'oid4', role: 'wallet', runs, blocked });

describe('the unit is the requirement, not the scenario', () => {
	it('counts requirements, so a partly-passing scenario shows partial credit', () => {
		const result = evaluate({ acceptance: run('acceptance', ['a1'], ['a2']) });

		const acceptance = result.obligations.find(
			(o) => o.obligation.kind === 'scenario' && o.obligation.scenario.slug === 'acceptance'
		);
		expect(acceptance).toMatchObject({ met: 1, total: 2 });
	});

	it('adds the base meter up from its own rows', () => {
		const result = evaluate({ acceptance: run('acceptance', ['a1', 'a2']) });

		expect(result.total).toBe(result.obligations.reduce((n, o) => n + o.total, 0));
		expect(result.met).toBe(result.obligations.reduce((n, o) => n + o.met, 0));
	});

	it('counts nothing for a scenario never run', () => {
		expect(evaluate({}).met).toBe(0);
	});
});

describe('a oneOf group is one obligation, not N', () => {
	it('contributes its shared requirement ids exactly once', () => {
		const result = evaluate({});
		const group = result.obligations.filter((o) => o.obligation.kind === 'oneOf');

		expect(group).toHaveLength(1);
		expect(group[0].total).toBe(2);
	});

	it('stops gating once one member passes', () => {
		const result = evaluate({ eddsa: run('eddsa', ['c1', 'c2']) });
		const group = result.obligations.find((o) => o.obligation.kind === 'oneOf')!;

		expect(group.met).toBe(group.total);
	});

	it('takes the best member, so the other alternative need never be run', () => {
		const result = evaluate({
			eddsa: run('eddsa', ['c1'], ['c2']),
			ecdsa: run('ecdsa', ['c1', 'c2'])
		});
		const group = result.obligations.find((o) => o.obligation.kind === 'oneOf')!;

		expect(group.met).toBe(2);
	});

	it('never double-counts a group whose members both pass', () => {
		const result = evaluate({
			eddsa: run('eddsa', ['c1', 'c2']),
			ecdsa: run('ecdsa', ['c1', 'c2'])
		});
		const group = result.obligations.find((o) => o.obligation.kind === 'oneOf')!;

		expect(group.total).toBe(2);
	});
});

describe('optional memberships are excluded from the base meter', () => {
	it('keeps optional work out of `total`, or the meter could never fill', () => {
		const result = evaluate({});
		const slugs = result.obligations.flatMap((o) =>
			o.obligation.kind === 'scenario' ? [o.obligation.scenario.slug] : []
		);

		expect(slugs).not.toContain('rich-content');
	});

	it('gives optional work its own meter', () => {
		const result = evaluate({ 'rich-content': run('rich-content', ['r1']) });

		expect(result.optional).toMatchObject({ met: 1, total: 1 });
	});

	it('lets the base meter fill while optional work is untouched', () => {
		const result = evaluate({
			acceptance: run('acceptance', ['a1', 'a2']),
			presentation: run('presentation', ['p1']),
			eddsa: run('eddsa', ['c1', 'c2'])
		});

		expect(isClaimable(result)).toBe(true);
		expect(result.optional.met).toBe(0);
	});
});

describe('a blocked obligation does not shrink the denominator', () => {
	const blocked = {
		acceptance: {
			kind: 'cryptosuite-unavailable' as const,
			requested: 'bbs-2023',
			available: ['eddsa-rdfc-2022']
		}
	};

	it('keeps its requirements in `total`', () => {
		const withBlock = evaluate({}, blocked);

		expect(withBlock.total).toBe(evaluate({}).total);
	});

	it('contributes nothing to `met`, even with a stored passing run', () => {
		const result = evaluate({ acceptance: run('acceptance', ['a1', 'a2']) }, blocked);
		const acceptance = result.obligations.find(
			(o) => o.obligation.kind === 'scenario' && o.obligation.scenario.slug === 'acceptance'
		)!;

		expect(acceptance.met).toBe(0);
	});

	it('surfaces the typed reason on the obligation', () => {
		const result = evaluate({}, blocked);
		const acceptance = result.obligations.find(
			(o) => o.obligation.kind === 'scenario' && o.obligation.scenario.slug === 'acceptance'
		)!;

		expect(acceptance.blocked?.kind).toBe('cryptosuite-unavailable');
	});

	it('blocks the badge rather than making it easier to earn', () => {
		const everythingElse = {
			presentation: run('presentation', ['p1']),
			eddsa: run('eddsa', ['c1', 'c2'])
		};

		expect(isClaimable(evaluate(everythingElse, blocked))).toBe(false);
	});

	it('lets a oneOf group survive one blocked alternative', () => {
		const groupBlock = {
			eddsa: { kind: 'did-method-unavailable' as const, requested: 'web', available: ['key'] }
		};
		const result = evaluate({ ecdsa: run('ecdsa', ['c1', 'c2']) }, groupBlock);
		const group = result.obligations.find((o) => o.obligation.kind === 'oneOf')!;

		expect(group.met).toBe(2);
		expect(group.blocked).toBeUndefined();
	});
});

describe('scoping', () => {
	it('is scoped to one role — an issuer scenario is not in the wallet meter', () => {
		const slugs = evaluate({}).obligations.flatMap((o) =>
			o.obligation.kind === 'scenario' ? [o.obligation.scenario.slug] : []
		);

		expect(slugs).not.toContain('issuer-side');
	});

	it('evaluates the issuer set separately', () => {
		const result = evaluateCompletion({ profile: 'oid4', role: 'issuer', runs: {} });

		expect(result.total).toBe(1);
	});

	it('is empty for a profile no scenario names', () => {
		const result = evaluateCompletion({ profile: 'vcalm', role: 'wallet', runs: {} });

		expect(result).toMatchObject({ met: 0, total: 0, obligations: [] });
	});
});

describe('only a passing outcome counts as met', () => {
	it('does not count a failing requirement', () => {
		const result = evaluate({ acceptance: run('acceptance', [], ['a1', 'a2']) });

		expect(result.met).toBe(0);
	});

	it('does not count an unanswered requirement', () => {
		const result = evaluate({ acceptance: run('acceptance', ['a1']) });
		const acceptance = result.obligations.find(
			(o) => o.obligation.kind === 'scenario' && o.obligation.scenario.slug === 'acceptance'
		)!;

		expect(acceptance.met).toBe(1);
	});
});

describe('isClaimable', () => {
	const full = {
		acceptance: run('acceptance', ['a1', 'a2']),
		presentation: run('presentation', ['p1']),
		eddsa: run('eddsa', ['c1', 'c2'])
	};

	it('is true exactly when the meter is full — they share a header and must agree', () => {
		const result = evaluate(full);

		expect(result.met).toBe(result.total);
		expect(isClaimable(result)).toBe(true);
	});

	it('is false one requirement short', () => {
		expect(isClaimable(evaluate({ ...full, presentation: run('presentation', [], ['p1']) }))).toBe(
			false
		);
	});

	it('is false for an empty set — a badge for nothing is not a badge', () => {
		expect(isClaimable(evaluateCompletion({ profile: 'vcalm', role: 'wallet', runs: {} }))).toBe(
			false
		);
	});

	it('ignores optional work entirely', () => {
		expect(isClaimable(evaluate(full))).toBe(true);
		expect(evaluate(full).optional.met).toBe(0);
	});
});

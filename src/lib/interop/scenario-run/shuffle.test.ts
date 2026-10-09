import { describe, expect, it } from 'vitest';

import { shuffleSteps } from './shuffle.js';
import { testStep } from './test-scenario.js';

const shuffled = (id: string) => testStep({ id, shuffle: true });
const plain = (id: string) => testStep({ id });
const ids = (steps: ReturnType<typeof testStep>[]) => steps.map((s) => s.id);

describe('shuffleSteps', () => {
	it('is deterministic for a given seed', () => {
		const steps = [shuffled('a'), shuffled('b'), shuffled('c')];

		expect(ids(shuffleSteps(steps, 'seed-1'))).toEqual(ids(shuffleSteps(steps, 'seed-1')));
	});

	it('produces a different order for a different seed, so a retry is not a replay', () => {
		const steps = [shuffled('a'), shuffled('b'), shuffled('c'), shuffled('d'), shuffled('e')];
		const orders = new Set(
			['s1', 's2', 's3', 's4', 's5', 's6'].map((seed) => ids(shuffleSteps(steps, seed)).join())
		);

		expect(orders.size).toBeGreaterThan(1);
	});

	it('keeps every step — a permutation, never a filter', () => {
		const steps = [shuffled('a'), plain('b'), shuffled('c')];

		expect(ids(shuffleSteps(steps, 'seed')).sort()).toEqual(['a', 'b', 'c']);
	});

	it('leaves unshuffled steps exactly where they are', () => {
		const steps = [plain('setup'), shuffled('a'), shuffled('b'), plain('debrief')];

		for (const seed of ['s1', 's2', 's3', 's4', 's5']) {
			const order = ids(shuffleSteps(steps, seed));
			expect(order[0]).toBe('setup');
			expect(order[3]).toBe('debrief');
		}
	});

	it('permutes only within a contiguous run, never across an unshuffled boundary', () => {
		const steps = [shuffled('a'), shuffled('b'), plain('wall'), shuffled('y'), shuffled('z')];

		for (const seed of ['s1', 's2', 's3', 's4', 's5', 's6']) {
			const order = ids(shuffleSteps(steps, seed));
			expect(order.slice(0, 2).sort()).toEqual(['a', 'b']);
			expect(order[2]).toBe('wall');
			expect(order.slice(3).sort()).toEqual(['y', 'z']);
		}
	});

	it('leaves a scenario with no shuffled steps completely alone', () => {
		const steps = [plain('one'), plain('two'), plain('three')];

		expect(ids(shuffleSteps(steps, 'any-seed'))).toEqual(['one', 'two', 'three']);
	});

	it('handles a lone shuffled step — it permutes with itself', () => {
		const steps = [plain('setup'), shuffled('only'), plain('debrief')];

		expect(ids(shuffleSteps(steps, 'seed'))).toEqual(['setup', 'only', 'debrief']);
	});

	it('does not mutate the input', () => {
		const steps = [shuffled('a'), shuffled('b'), shuffled('c')];
		const before = ids(steps);
		shuffleSteps(steps, 'seed');

		expect(ids(steps)).toEqual(before);
	});

	it('reaches every ordering of three passes across enough seeds', () => {
		const steps = [shuffled('a'), shuffled('b'), shuffled('c')];
		const seen = new Set<string>();
		for (let i = 0; i < 200; i++) seen.add(ids(shuffleSteps(steps, `seed-${i}`)).join());

		// A discrimination scenario whose passes could never land in some order
		// would be learnable in exactly that way.
		expect(seen.size).toBe(6);
	});
});

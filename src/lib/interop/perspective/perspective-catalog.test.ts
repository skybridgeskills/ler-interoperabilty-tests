import { describe, expect, it } from 'vitest';

import { allAdditiveProfiles } from '../additive-profiles/all-additive-profiles.js';
import { allProfiles } from '../profiles/all-profiles.js';
import { allRoles } from '../roles.js';
import { allScenarios } from '../scenarios/all-scenarios.js';

/**
 * Every Perspective string in the catalog exists in both versions and the two
 * genuinely differ — a Builder line copied into the Evaluator slot is a
 * missing Evaluator line. The schema already requires both to be non-empty.
 */
const cards = [
	...allRoles.map((r) => ({ owner: `role:${r.slug}`, copy: r.example })),
	...allProfiles.map((p) => ({ owner: `profile:${p.slug}`, copy: p.example })),
	...allAdditiveProfiles.map((a) => ({ owner: `add-on:${a.slug}`, copy: a.example }))
];

describe('Perspective copy in the catalog', () => {
	it('every choice card has two different example lines, each one short sentence', () => {
		expect(cards.filter((c) => c.copy.builder === c.copy.evaluator).map((c) => c.owner)).toEqual(
			[]
		);
		const long = cards.flatMap((c) =>
			[c.copy.builder, c.copy.evaluator].filter((line) => line.length > 90).map(() => c.owner)
		);
		expect(long).toEqual([]);
	});

	it('every scenario frames itself for both Perspectives, differently', () => {
		const missing = allScenarios
			.filter((s) => !s.framing || s.framing.builder === s.framing.evaluator)
			.map((s) => s.slug);
		expect(missing).toEqual([]);
	});
});
